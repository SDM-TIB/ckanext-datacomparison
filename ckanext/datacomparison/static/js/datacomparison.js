const arrayColumn = (arr, n) => arr.map(x => x[n]),
      classes_label = ['mr-2', 'text-xs', 'required'],
      classes_input_resources = ['mr-4', 'rounded-input'];

function openTab(evt, tabName) {
    let i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName('tabcontent');
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName('tablinks');
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(' active', "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.className += ' active';
}

document.getElementById('defaultOpen').click();  // open default tab

function createLabel(text, htmlFor, classes) {
    let label = document.createElement('label');
    label.innerText = text;
    label.htmlFor = htmlFor;
    DOMTokenList.prototype.add.apply(label.classList, classes);
    return label
}

function createInput(id_, type, placeholder, classes, required, size) {
    let input = document.createElement('input');
    DOMTokenList.prototype.add.apply(input.classList, classes);
    input.type = type;
    input.id = id_;
    input.name = id_;
    if (size !== null) {
        input.size = size;
    }
    input.placeholder = placeholder;
    input.required = required;
    return input
}
function addNewResourceForm() {
    num_resources += 1;
    const submit_btn = $('#dataset_submit');
    submit_btn.remove();

    for (let i = 2; i < num_resources; i++) {
        // prevent changes to previous resources since they would be ignored
        $('#res' + i + 'label').prop('disabled', 'true');
        if (i > 1) { $('#res' + i).prop('disabled', 'true') }
    }

    const new_label_id = 'res' + num_resources + 'label',
          new_url_id = 'res' + num_resources;

    new_resource.append(document.createElement('br'));
    new_resource.append(document.createElement('br'));
    let heading = document.createElement('b');
    heading.innerText = 'Resource ' + num_resources;
    new_resource.append(heading);
    new_resource.append(document.createElement('br'));
    new_resource.append(createLabel('Label:', new_label_id, classes_label));
    new_resource.append(createInput(new_label_id, 'text', 'name', classes_input_resources, true, 12));
    new_resource.append(createLabel('URL:', new_url_id, classes_label));
    new_resource.append(createInput(new_url_id, 'text', 'URL for file', classes_input_resources, true, 80));
    new_resource.append(submit_btn);
}

let num_resources = 2;
const new_resource = $('#datasets');
new_resource.on('submit', function(event) {
    event.preventDefault();

    if (num_resources === 2) {
        const elem_res1_label = $('#res1label'),
              res1_label = ' (' + elem_res1_label.val() + ')';
        for (let i = 1; i < columns.length; i++) { columns[i] = columns[i] + res1_label }
        elem_res1_label.prop('disabled', 'true');
    }
    const res_new = $('#res' + num_resources).val(),
          res_new_label = ' (' + $('#res' + num_resources + 'label').val() + ')';

    $.ajax({
        async: false,
        type: 'GET',
        url: res_new,
        crossDomain: true,
        success: function(data) {
            let data_new = $.csv.toArrays(data);
            let columns_new = data_new.shift();
            for (let i = 1; i < columns_new.length; i++) { columns_new[i] = columns_new[i] + res_new_label }

            const intersection = columns.filter(value => columns_new.includes(value));
            if (1 === 1) {
                const join_column = intersection[0],
                    idx_old = 0, //columns.indexOf(join_column),
                    idx_new = 0, //columns_new.indexOf(join_column),
                    num_cols_old = columns.length - 1,
                    num_cols_new = columns_new.length - 1;

                let columns_copy = [...columns_new];
                columns_copy.splice(idx_new, 1);
                columns = columns.concat(columns_copy);

                while (data_new.length > 0) {
                    let found = false,
                        record = data_new.shift();
                    for (let i = 0; i < data_.length; i++) {
                        if (record[idx_new] == data_[i][idx_old]) {
                            found = true;
                            record.splice(idx_new, 1);

                            let length = record.length;
                            while (length < num_cols_new) {
                                record.push(null);
                                length++;
                            }

                            data_[i] = data_[i].concat(record);
                            break;
                        }
                    }
                    if (!found) {
                        let record_old = Array(num_cols_old + 1).fill(null);
                        record_old[idx_old] = record[idx_new];
                        record.splice(idx_new, 1);
                        record = record_old.concat(record);
                        data_.push(record);
                    }
                }

                const num_cols = num_cols_old + num_cols_new + 1;
                for (let i = 0; i < data_.length; i++) {  // Take care of the old records which have not been updated yet...
                    if (data_[i].length < num_cols) { data_[i] = data_[i].concat(Array(num_cols - data_[i].length).fill(null)) }
                }

                addNewResourceForm();
            } else {
                console.log('There is either no or several matching column(s).')
            }
        },
        error: function(jqXHR, textStatus) {
            console.log(jqXHR.status);
            console.log(jqXHR.responseText);
            console.log(textStatus);
        }
    });
    updateUI();
})

const chart_builder = $('#chartBuilder');
chart_builder.on('submit', function(event) {
    event.preventDefault();
    $('#guidingText').hide();

    const chart_type = $('#chartType').val(),
          group_column = columns.indexOf($('#xAxis').val()),
          checked_inputs_yAxis = document.querySelectorAll('input[name=yAxis]:checked');

    const data_xAxis = arrayColumn(data_, group_column);
    let traces = [];
    for (let i = 0; i < checked_inputs_yAxis.length; i++) {
        const dataset_name = checked_inputs_yAxis[i].value,
              dataset_idx = columns.indexOf(dataset_name);

        switch (chart_type) {
            case 'line':
                traces.push({
                    x: data_xAxis,
                    y: arrayColumn(data_, dataset_idx),
                    name: dataset_name,
                    type: 'scatter',
                    mode: 'lines',
                    line: {
                        'shape': 'spline',
                        'smoothing': 1.3
                    }
                });
                break;
            case 'scatter':
                traces.push({
                    x: data_xAxis,
                    y: arrayColumn(data_, dataset_idx),
                    name: dataset_name,
                    type: 'scatter',
                    mode: 'markers'
                });
                break;
            case 'bar':
                traces.push({
                    x: data_xAxis,
                    y: arrayColumn(data_, dataset_idx),
                    name: dataset_name,
                    type: 'bar'
                });
                break;
            default:
                console.log('Sorry not yet implemented!');
        }
    }
    let layout = { hovermode: 'x unified', xaxis: data_xAxis };
    if ($('#logScale').is(':checked')) {
        layout['yaxis'] = {
            type: 'log',
            autorange: true
        }
    }

    Plotly.newPlot('gd', traces, layout, { displaylogo: false, responsive: true });
});

let data_explorer = document.getElementById('data-explorer-comparison'),
    data_package = JSON.parse(data_explorer.dataset.datapackage);

let columns = null,
    data_ = [];
const xAxis = document.getElementById('xAxis'),
      yAxis = document.getElementById('yAxis');

function setNumberRows(count) { $('#totalRows').text('Total rows: ' + count) }

function loadData() {
    let error = false;
    if ('api' in data_package['datapackage']['resources'][0]) {
        const request_url = data_package['datapackage']['resources'][0]['api'];
        $.ajax({
            async: false,
            type: 'GET',
            url: request_url,
            crossDomain: true,
            success: function(data) {
                let records = data.result.records;
                for (let i = 0; i < records.length; i++) {
                    const record = records[i];
                    let values = Object.values(record);
                    values.shift();
                    data_.push(values)
                    if (i === 0) { columns = Object.keys(record); }
                }

                columns.shift();  // removing the _id column
            },
            error: function(jqXHR, textStatus) {
                error = true;
                console.log(jqXHR.status);
                console.log(jqXHR.responseText);
                console.log(textStatus);
            }
        });
    } else {
        const dataset_path = data_package['datapackage']['resources'][0]['path'];
        $.ajax({
            async: false,
            type: 'GET',
            url: dataset_path,
            crossDomain: true,
            success: function(data) {
                data_ = $.csv.toArrays(data);
                columns = data_.shift();
            },
            error: function(jqXHR, textStatus) {
                error = true;
                console.log(jqXHR.status);
                console.log(jqXHR.responseText);
                console.log(textStatus);
            }
        });
    }

    if (!error) { updateUI()}
}
loadData();

function updateUI() {
    initChartBuilder();
    setNumberRows(data_.length);

    let colDef = [];
    for (const j in columns) { colDef.push({ title: columns[j] }) }

    if ($.fn.DataTable.isDataTable('#comparison-table')) {
        const comparison_table = $('#comparison-table');
        comparison_table.DataTable().clear().destroy();
        comparison_table.html('');
    }
    new DataTable('#comparison-table', {
        destroy: true,
        dom: 'Qfrtip',
        columns: colDef,
        data: data_
    });
}

function initChartBuilder() {
    $('#xAxis').empty();
    yAxis.replaceChildren();

    for (let i = 0; i < columns.length; i++) {
        const column = columns[i];

        // xAxis
        let option = document.createElement('option');
        option.text = column;
        xAxis.add(option);

        // yAxis
        let label = document.createElement('label');
        label.classList.add('block', 'font-bold', 'text-white');
        let input = document.createElement('input');
        input.id = 'yAxis' + i;
        input.classList.add('ml-2', 'mr-2', 'leading-tight');
        input.type = 'checkbox';
        input.name = 'yAxis';
        input.value = column;
        if (i === 0) {
            input.checked = true;
        }
        let span = document.createElement('span');
        span.classList.add('text-xs');
        span.innerText = column;
        label.appendChild(input);
        label.appendChild(span);
        yAxis.appendChild(label);
    }
}

//console.log(window.parent.document.getElementsByClassName("ckanext-datapreview"))
//console.log(window.parent.document.getElementsByClassName("ckanext-datapreview").item(0))
//console.log(window.parent.document.getElementsByClassName("ckanext-datapreview").item(0).children.item(1).height = '1000px')
// TODO: This is how we can access the iframe and change its height if necessary. It seems that the autofit for the size (setting the style of the iframe) is triggered randomly