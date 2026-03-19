const classes_label = ['mr-2', 'text-xs', 'required'],
      classes_input_resources = ['mr-4', 'rounded-input'],
      details = document.getElementById('details-comparison');

let height_details = getHeight(details);

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

function updateIFrameHeight(difference) {
    let iframe = window.parent.document.getElementsByClassName('ckanext-datapreview').item(0).children.item(1),
        iframe_height = getHeight(iframe);
    iframe.style.height = (iframe_height + difference) + 'px';
}

function details_height_update() {
    let height_details_new = getHeight(details);
    updateIFrameHeight(height_details_new - height_details);
    height_details = height_details_new;
}

details.addEventListener('toggle', details_height_update);

function addNewResourceForm() {
    num_resources += 1;
    const submit_btn = document.getElementById('dataset_submit');
    submit_btn.remove();

    for (let i = 2; i < num_resources; i++) {
        // prevent changes to previous resources since they would be ignored
        document.getElementById('res' + i + 'label').disabled = true;
        if (i > 1) { document.getElementById('res' + i).disabled = true }
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
    let input_url = createInput(new_url_id, 'text', 'URL for file', classes_input_resources, true, 80);
    input_url.setAttribute('list', 'resource_list');
    input_url.oninput = function() { return populateSearchBar(this.value) };
    new_resource.append(input_url);
    new_resource.append(submit_btn);

    details_height_update();
}

function applyJoin(data_new, columns_new_raw, join_col_old, join_col_new, res_new_label) {
    if (num_resources === 2) {
        join_column_name = join_col_old;
        const elem_res1_label = document.getElementById('res1label'),
              res1_label = ' (' + elem_res1_label.value + ')';
        for (let i = 0; i < columns.length; i++) {
            if (columns[i] !== join_col_old) { columns[i] = columns[i] + res1_label; }
        }
        elem_res1_label.disabled = true;
    }

    const idx_old = columns.indexOf(join_column_name),
          idx_new = columns_new_raw.indexOf(join_col_new),
          num_cols_old = columns.length - 1,
          num_cols_new = columns_new_raw.length - 1;

    for (let i = 0; i < columns_new_raw.length; i++) {
        if (i !== idx_new) { columns_new_raw[i] = columns_new_raw[i] + res_new_label; }
    }

    let columns_copy = [...columns_new_raw];
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
    updateUI();
}

// Returns up to n non-empty values from a column in a 2D data array.
function getSamples(data, colIndex, n = 5) {
    const samples = [];
    for (let i = 0; i < data.length && samples.length < n; i++) {
        const val = data[i][colIndex];
        if (val !== null && val !== undefined && val !== '') {
            samples.push(val);
        }
    }
    return samples;
}

// Renders sample value pills into a target element.
function renderSamples(samples, targetEl) {
    targetEl.replaceChildren();
    samples.forEach(val => {
        let pill = document.createElement('span');
        pill.classList.add('join-modal-sample-pill');
        pill.innerText = val;
        pill.title = val;  // show full value on hover if truncated
        targetEl.append(pill);
    });
}

function showJoinPicker(data_new, columns_new_raw, res_new_label) {
    const backdrop = document.getElementById('join-modal-backdrop'),
          select_old = document.getElementById('join_col_old_select'),
          select_new = document.getElementById('join_col_new_select'),
          old_select_wrapper = document.getElementById('join-modal-old-select-wrapper'),
          old_info = document.getElementById('join-modal-old-info'),
          old_samples_el = document.getElementById('join-modal-old-samples'),
          old_fixed_samples_el = document.getElementById('join-modal-old-fixed-samples'),
          new_samples_el = document.getElementById('join-modal-new-samples');

    // Populate the selects with current column options
    select_old.replaceChildren();
    columns.forEach(col => {
        let opt = document.createElement('option');
        opt.value = col;
        opt.text = col;
        select_old.add(opt);
    });

    select_new.replaceChildren();
    columns_new_raw.forEach(col => {
        let opt = document.createElement('option');
        opt.value = col;
        opt.text = col;
        select_new.add(opt);
    });

    // Toggle left-side state and render samples for the old resource
    if (num_resources === 2) {
        old_select_wrapper.style.display = '';
        old_info.style.display = 'none';
        // Show samples for whichever column is currently selected, update on change
        const refreshOldSamples = () => {
            const idx = columns.indexOf(select_old.value);
            renderSamples(getSamples(data_, idx), old_samples_el);
        };
        refreshOldSamples();
        select_old.onchange = refreshOldSamples;
    } else {
        old_select_wrapper.style.display = 'none';
        old_info.style.display = '';
        document.getElementById('join-modal-old-info-text').innerText = join_column_name;
        // Fixed column — render samples once, no change handler needed
        const idx = columns.indexOf(join_column_name);
        renderSamples(getSamples(data_, idx), old_fixed_samples_el);
    }

    // Update the new-resource label to reflect the current resource number
    document.getElementById('join-modal-new-label').innerText = 'Column from Resource ' + num_resources + ':';

    // Show samples for the new resource's selected column, update on change
    const refreshNewSamples = () => {
        const idx = columns_new_raw.indexOf(select_new.value);
        renderSamples(getSamples(data_new, idx), new_samples_el);
    };
    refreshNewSamples();
    select_new.onchange = refreshNewSamples;

    // Wire up buttons (onclick assignment replaces any previous handler)
    document.getElementById('join-modal-cancel').onclick = function() {
        backdrop.style.display = 'none';
    };
    document.getElementById('join-modal-confirm').onclick = function() {
        const col_old = num_resources === 2 ? select_old.value : join_column_name;
        const col_new = select_new.value;
        backdrop.style.display = 'none';
        applyJoin(data_new, columns_new_raw, col_old, col_new, res_new_label);
    };

    backdrop.style.display = 'flex';
}

let num_resources = 2,
    resource_list = document.getElementById('resource_list'),
    join_column_name = null;  // tracks the established join key across all resources
const new_resource = document.getElementById('datasets');
document.getElementById('res2').oninput = function() { return populateSearchBar(this.value) };
new_resource.onsubmit = function(event) {
    event.preventDefault();

    const res_new = document.getElementById('res' + num_resources).value,
          res_new_label = ' (' + document.getElementById('res' + num_resources + 'label').value + ')';

    fetch(res_new)
        .then(res => res.text())
        .then(data => {
            let data_new = Papa.parse(data, { skipEmptyLines: 'greedy' }).data,
                columns_new_raw = data_new.shift();
            showJoinPicker(data_new, columns_new_raw, res_new_label);
        })
        .catch(err => console.error(err));
};

function populateSearchBar(name) {
    resource_list.replaceChildren();
    if (name.length < 3) { return; }  // start searching for resources from three letters

    fetch(data_package['api'] + '?query=name:' + name)
        .then(res => res.json())
        .then(data => {
            if (data['success']) {
                const resource_data = data['result']['results'];
                resource_data.forEach((res) => {
                    let option = document.createElement('option');
                    option.value = res['url'];
                    option.innerText = res['name'];
                    if (res['description']) { option.innerText += ': ' + res['description'] }
                    resource_list.append(option);
                })
            }
        })
        .catch(err => console.error(err));
}
