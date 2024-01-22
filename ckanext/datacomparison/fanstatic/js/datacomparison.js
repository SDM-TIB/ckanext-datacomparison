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
    Plotly.newPlot('gd', traces, {hovermode: 'x unified', xaxis: data_xAxis}, {displaylogo: false, responsive: true});
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

    if (!error) {
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
}
loadData();

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
        input.classList.add('mr-2', 'leading-tight');
        input.type = 'checkbox';
        input.name = 'yAxis';
        input.value = column;
        if (i === 0) {
            input.checked = true;
        }
        let span = document.createElement('span');
        span.classList.add('text-xs', 'mr-2');
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