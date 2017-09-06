/**
 * Callback of the Google Map API loading.
 * Load both Map and charts.
 */
function initTraceroutePlot() {
    let filterSelect = $("#traceroute-picker");

    let crop = new Apisense.Crop("kzOZK30R04i9wlE5v0KE", {});
    let map = new TracerouteMap(document.getElementById("map-canvas"));
    let charts = new TracerouteCharts(crop);

    // We assign hooks when Google Map and the document are both loaded.
    $(document).ready(function () {
        initializePlots(map, crop, charts, filterSelect);

        $("#loading-data").click(function () {
            crop.getRecords().then((records) => {
                let filters = filterSelect.selectpicker().find("option:selected");
                let filtered = filterData(records, filters);

                map.plotData(filtered);
                charts.clearCharts();
                charts.loadCharts(filtered)
            });
        });
    });
}

function filterData(records, filters) {
    let data = records;
    let selected = [];
    $(filters).each(function (index, filter) {
        selected.push($(this).val());
    });

    if (selected !== undefined && selected !== "" && selected !== []) {
        data = data.filter(function (entry) {
            return entry.target === selected || selected.includes(entry.target);
        })
    }
    return data;
}

/**
 * Load the crop data on the given map and the charts.
 * Also initialize values of the filter select.
 *
 * @param map The map to plot data on.
 * @param crop The crop to load data from.
 * @param charts The TracerouteCharts object to initialize.
 * @param select The select to update with filters data.
 */
function initializePlots(map, crop, charts, select) {
    crop.getRecords().then((records) => {
        let validTraceroutes = records.filter((value) => value.scan_trace !== undefined);
        initSelect(select, validTraceroutes);

        charts.loadCharts(validTraceroutes);
    });
}


function initSelect(select, records) {
    let data = records.map((entry) => (entry.target));
    emptySelect(select);
    fillSelect(select, Array.from(new Set(data))); // Keeping only distinct values
}

function emptySelect(select) {
    // Backward traversal is important here
    for (let i = select.length - 1; i >= 0; i--) {
        select.remove(i);
    }
}

function fillSelect(select, data) {
    for (let i = 0; i < data.length; i++) {
        let opt = data[i];
        let el = document.createElement("option");
        el.textContent = opt;
        el.value = opt;
        select[0].appendChild(el);
    }
    select.selectpicker('refresh');
}