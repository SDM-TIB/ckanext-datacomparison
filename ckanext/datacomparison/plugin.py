
from logging import getLogger

from ckan.common import json  # this is fine, there is ckan.common.json ...
import ckan.plugins as p
import ckan.plugins.toolkit as toolkit
from ckan.lib.helpers import url_for

log = getLogger(__name__)
ignore_empty = p.toolkit.get_validator('ignore_empty')
natural_number_validator = p.toolkit.get_validator('natural_number_validator')
Invalid = p.toolkit.Invalid


def each_datastore_field_to_schema_type(dstore_type):
    # Adopted from https://github.com/frictionlessdata/datapackage-pipelines-ckan-driver/blob/master/tableschema_ckan_datastore/mapper.py
    """
    For a given datastore type, return the corresponding schema type.
    datastore int and float may have a trailing digit, which is stripped.
    datastore arrays begin with an '_'.
    """
    dstore_type = dstore_type.rstrip('0123456789')
    if dstore_type.startswith('_'):
        dstore_type = 'array'
    DATASTORE_TYPE_MAPPING = {
        'int': ('integer', None),
        'float': ('number', None),
        'smallint': ('integer', None),
        'bigint': ('integer', None),
        'integer': ('integer', None),
        'numeric': ('number', None),
        'money': ('number', None),
        'timestamp': ('datetime', 'any'),
        'date': ('date', 'any'),
        'time': ('time', 'any'),
        'interval': ('duration', None),
        'text': ('string', None),
        'varchar': ('string', None),
        'char': ('string', None),
        'uuid': ('string', 'uuid'),
        'boolean': ('boolean', None),
        'bool': ('boolean', None),
        'json': ('object', None),
        'jsonb': ('object', None),
        'array': ('array', None)
    }
    try:
        return DATASTORE_TYPE_MAPPING[dstore_type]
    except KeyError:
        log.warning('Unsupported DataStore type \'{}\'. Using \'string\'.'.format(dstore_type))
        return 'string', None


def datastore_fields_to_schema(resource):
    """
    Return a table schema from a DataStore field types.
    :param resource: resource dict
    :type resource: dict
    """
    data = {'resource_id': resource['id'], 'limit': 0}

    fields = toolkit.get_action('datastore_search')({}, data)['fields']
    ts_fields = []
    for f in fields:
        if f['id'] == '_id':
            continue
        datastore_type = f['type']
        datastore_id = f['id']
        ts_type, ts_format = each_datastore_field_to_schema_type(
            datastore_type)
        ts_field = {
            'name': datastore_id,
            'type': ts_type
        }
        if ts_format is not None:
            ts_field['format'] = ts_format
        ts_fields.append(ts_field)
    return ts_fields


def valid_fields_as_options(schema, valid_field_types=[]):
    """
    Return a list of all datastore schema fields types for a given resource, as long as
    the field type is in valid_field_types.

    :param schema: schema dict
    :type schema: dict
    :param valid_field_types: field types to include in returned list
    :type valid_field_types: list of strings
    """

    return [{'value': f['name'], 'text': f['name']} for f in schema
            if f['type'] in valid_field_types or valid_field_types == []]


def in_list(list_possible_values):
    """
    Validator that checks that the input value is one of the given
    possible values.

    :param list_possible_values: function that returns list of possible values
        for validated field
    :type list_possible_values: function
    """
    def validate(key, data, errors, context):
        if not data[key] in list_possible_values():
            raise Invalid('"{0}" is not a valid parameter'.format(data[key]))
    return validate


class DataComparisonViewBase(p.SingletonPlugin):
    p.implements(p.IConfigurable, inherit=True)
    p.implements(p.IConfigurer, inherit=True)
    p.implements(p.IResourceView, inherit=True)
    p.implements(p.ITemplateHelpers, inherit=True)
    
    # IConfigurable
    def configure(self, config):
        toolkit.add_resource('fanstatic', 'datacomparison')

    # IConfigurer
    def update_config(self, config_):
        toolkit.add_template_directory(config_, 'templates')
        toolkit.add_public_directory(config_, 'public')
        toolkit.add_resource('fanstatic', 'datacomparison')

    def can_view(self, data_dict):
        resource = data_dict['resource']
        return (resource.get('datastore_active') or
                '_datastore_only_resource' in resource.get('url', ''))

    def get_helpers(self):
        return {}

    def view_template(self, context, data_dict):
        return 'datacomparison.html'


class DataComparisonView(DataComparisonViewBase):
    """
        This extension resources views using the datacomparison.
    """

    def info(self):
        return {
            'name': 'datacomparison_view',
            'title': 'DataComparison',
            'icon': 'table',
            'requires_datastore': False,
            'default_title': p.toolkit._('Data Comparison'),
        }

    def setup_template_variables(self, context, data_dict):
        data_dict['resource'].update({
            'title': data_dict['resource']['name'],
            'path': data_dict['resource']['url'],
        })
        
        if data_dict['resource'].get('datastore_active'):
            schema = datastore_fields_to_schema(data_dict['resource'])
            data_dict['resource'].update({
              'schema': {'fields': schema},
              'api': url_for('api.action', ver=3, logic_function='datastore_search', resource_id=data_dict['resource']['id'], _external=True),
            })

        datapackage = {'resources': [data_dict['resource']]}

        return {
            'resource_view': data_dict['resource_view'],
            'datapackage':  datapackage
        }

    def can_view(self, data_dict):
        resource = data_dict['resource']

        if (resource.get('datastore_active') or
                '_datastore_only_resource' in resource.get('url', '')):
            return True
        resource_format = resource.get('format', None)
        if resource_format:
            return resource_format.lower() in ['csv', 'xls', 'xlsx', 'tsv']
        else:
            return False


class DataComparisonTableView(DataComparisonViewBase):
    """
        This extension provides table views using the datacomparison.
    """

    def info(self):
        return {
            'name': 'datacomparison_table_view',
            'title': 'Table',
            'filterable': False,
            'icon': 'table',
            'requires_datastore': False,
            'default_title': p.toolkit._('Table'),
        }

    def setup_template_variables(self, context, data_dict):
        schema = datastore_fields_to_schema(data_dict['resource'])
        filters = data_dict['resource_view'].get('filters', {})

        data_dict['resource'].update({
            'schema': {'fields': schema},
            'title': data_dict['resource']['name'],
            'path': data_dict['resource']['url'],
            'api': url_for('api.action', ver=3, logic_function='datastore_search', resource_id=data_dict['resource']['id'], filters=json.dumps(filters), _external=True),
        })

        datapackage = {'resources': [data_dict['resource']]}

        return {
            'resource_view': data_dict['resource_view'],
            'datapackage':  datapackage
        }

    def can_view(self, data_dict):
        resource = data_dict['resource']

        if (resource.get('datastore_active') or
                '_datastore_only_resource' in resource.get('url', '')):
            return True
        resource_format = resource.get('format', None)
        if resource_format:
            return resource_format.lower() in ['csv', 'xls', 'xlsx', 'tsv']
        else:
            return False


class DataComparisonChartView(DataComparisonViewBase):
    """
    This extension provides chart views using the datacomparison.
    """
    chart_types = [{'value': 'bar', 'text': 'Bar'},
                   {'value': 'line', 'text': 'Line'}]

    datastore_schema = []
    datastore_field_types = ['number', 'integer', 'datetime', 'date', 'time']

    def list_chart_types(self):
        return [t['value'] for t in self.chart_types]

    def list_schema_fields(self):
        return [t['name'] for t in self.datastore_schema]

    def info(self):
        schema = {
            'offset': [ignore_empty, natural_number_validator],
            'limit': [ignore_empty, natural_number_validator],
            'chart_type': [ignore_empty, in_list(self.list_chart_types)],
            'group': [ignore_empty, in_list(self.list_schema_fields)],
            'chart_series': [ignore_empty]
        }

        return {
            'name': 'datacomparison_chart_view',
            'title': 'Chart',
            'filterable': False,
            'icon': 'bar-chart-o',
            'requires_datastore': False,
            'schema': schema,
            'default_title': p.toolkit._('Chart'),
        }

    def setup_template_variables(self, context, data_dict):
        spec = {}
        chart_type = data_dict['resource_view'].get('chart_type', False)
        group = data_dict['resource_view'].get('group', False)
        chart_series = data_dict['resource_view'].get('chart_series', False)
        if chart_type:
            spec.update({'type': chart_type})
        if group:
            spec.update({'group': group})
        if chart_series:
            spec.update({'series': chart_series if isinstance(
                chart_series, list) else [chart_series]})

        filters = data_dict['resource_view'].get('filters', {})
        limit = data_dict['resource_view'].get('limit', 100)
        offset = data_dict['resource_view'].get('offset', 0)

        self.datastore_schema = datastore_fields_to_schema(
            data_dict['resource'])

        data_dict['resource'].update({
            'schema': {'fields': self.datastore_schema},
            'title': data_dict['resource']['name'],
            'path': data_dict['resource']['url'],
            'api': url_for('api.action', ver=3, logic_function='datastore_search', resource_id=data_dict['resource']['id'],
                           filters=json.dumps(filters), limit=limit, offset=offset, _external=True),
        })

        datapackage = {'resources': [data_dict['resource']]}
        groups = valid_fields_as_options(
            self.datastore_schema)
        chart_series = valid_fields_as_options(
            self.datastore_schema, self.datastore_field_types)

        return {
            'resource_view': data_dict['resource_view'],
            'datapackage':  datapackage,
            'chart_types':  self.chart_types,
            'chart_series': chart_series,
            'groups': groups,
        }

    def can_view(self, data_dict):
        resource = data_dict['resource']

        if (resource.get('datastore_active') or
                '_datastore_only_resource' in resource.get('url', '')):
            return True
        resource_format = resource.get('format', None)
        if resource_format:
            return resource_format.lower() in ['csv', 'xls', 'xlsx', 'tsv']
        else:
            return False

    def form_template(self, context, data_dict):
        return 'chart_form.html'
