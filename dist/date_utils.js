'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function datetimes_from_ts(column) {
    return column.map(function (datestring) {
        return new Date(datestring);
    });
}

function get_gran(df) {
    var index = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

    var col = df.map(function (row) {
        return row[index];
    }).map(function (row) {
        return new Date(row);
    });
    var n = col.length;

    var _col$sort$reverse$sli = col.sort().reverse().slice(0, 2),
        _col$sort$reverse$sli2 = _slicedToArray(_col$sort$reverse$sli, 2),
        largest = _col$sort$reverse$sli2[0],
        second_largest = _col$sort$reverse$sli2[1];

    var gran = (largest - second_largest) / 1000;

    if (gran >= 86400) return 'day';else if (gran >= 3600) return 'hr';else if (gran >= 60) return 'min';else if (gran >= 1) return 'sec';else return 'ms';
}

module.exports.get_gran = get_gran;
//# sourceMappingURL=date_utils.js.map