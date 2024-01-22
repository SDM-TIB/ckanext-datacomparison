const arrayColumn = (arr, n) => arr.map(x => x[n]);

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

const new_resource = $('#dataset2');
new_resource.on('submit', function(event) {
    event.preventDefault();
    const res2 = $('#res2').val();

    $.ajax({
        async: false,
        type: 'GET',
        url: res2,
        crossDomain: true,
        success: function(data) {
            let data_new = $.csv.toArrays(data);
            let columns_new = data_new.shift();

            const intersection = columns.filter(value => columns_new.includes(value));
            if (intersection.length === 1) {
                const join_column = intersection[0],
                    idx_old = columns.indexOf(join_column),
                    idx_new = columns_new.indexOf(join_column),
                    num_cols_old = columns.length - 1,
                    num_cols_new = columns_new.length - 1;

                let columns_copy = [...columns_new];
                columns_copy.splice(idx_new, 1);
                columns = columns.concat(columns_copy);

                while (data_new.length > 0) {
                    let found = false,
                        record = data_new.shift();
                    console.log(record);
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

                updateUI();
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
    // TODO: needs to destroy previous iteration...
    initChartBuilder();
    setNumberRows(data_.length);

    let colDef = [];
    for (const j in columns) { colDef.push({ title: columns[j] }) }
    new DataTable('#comparison-table', {
        dom: 'Qfrtip',
        columns: colDef,
        data: data_
    });
}

function initChartBuilder() {
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