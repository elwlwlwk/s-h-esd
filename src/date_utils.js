function datetimes_from_ts(column) {
    return column.map(datestring => new Date(datestring));
}

function get_gran(df, index=0) {
    var col = df.map( (row) => row[index]).map( (row) => new Date(row) );
    var n = col.length;
    var [largest, second_largest] = col.sort().reverse().slice(0,2);
    var gran = (largest - second_largest) / 1000;

    if(gran >= 86400) return 'day';
    else if(gran >= 3600) return 'hr';
    else if(gran >= 60) return 'min';
    else if(gran >= 1) return 'sec';
    else return 'ms';
}

module.exports.get_gran = get_gran;