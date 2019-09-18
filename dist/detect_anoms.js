'use strict';

var _stlnode = require('stlnode');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var libR = require('lib-r-math.js');
var StudentT = libR.StudentT,
    MarsagliaMultiCarry = libR.rng.MarsagliaMultiCarry,
    AhrensDieter = libR.rng.normal.AhrensDieter;

//*.Uses default argument "Normal()".
//*.Normal itself using default arguments.

var defaultT = StudentT();

//explicit use of PRNG's
var mmc = new MarsagliaMultiCarry(0);
var ad = new AhrensDieter(mmc);

//*create explicit functions
var explicitT = StudentT(ad);

var pt = explicitT.pt;


function transpose(m) {
    return m[0].map(function (x, i) {
        return m.map(function (x) {
            return x[i];
        });
    });
};

function median(x) {
    var t_x = x.slice(0).sort(function (a, b) {
        return a - b;
    });
    return t_x[parseInt(t_x.length / 2)];
}

function mad(x) {
    var c = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0.6744897501960817;

    var med = median(x);
    return median(x.map(function (x) {
        return Math.abs(x - med);
    })) / c;
}

function erf(xe) {
    var eres = new Array();
    var xet = new Array();
    var sume = 0;
    var c = new Array();
    c[0] = 0;c[1] = -2 / Math.sqrt(Math.PI);c[2] = -6.366197121956e-1;c[3] = -1.027728162129e-1;c[4] = 1.912427299414e-2;c[5] = 2.401479235527e-4;
    c[6] = -1.786242904258e-3;c[7] = 7.336113173091e-4;c[8] = -1.655799102866e-4;c[9] = 2.116490536557e-5;c[10] = -1.96623630319e-6;
    var xsqr;
    if (xe.constructor != Array) {
        xet = new Array(1);xet[0] = xe;eres[0] = 0;
    } else {
        for (var ie = 0; ie < xe.length; ie++) {
            eres[ie] = 0;xet[ie] = parseFloat(xe[ie]);
        }
    }
    for (var ie = 0; ie < xet.length; ie++) {
        var sgn = 1;
        if (xet[ie] < 0) sgn = -1;
        sume = 0;
        for (var je = 1; je < c.length; je++) {
            sume = sume + c[je] * Math.pow(Math.abs(xet[ie]), je);
        }
        eres[ie] = sgn * (1 - Math.exp(sume)) * 1;
    }
    return eres;
}

function stdtrit(df, q) {
    var large = 100;
    var small = 0;
    for (var i = 0; i < 30; i++) {
        if (pt(small + (large - small) / 2, df) > q) {
            large -= (large - small) / 2;
        } else {
            small += (large - small) / 2;
        }
    }
    return (large + small) / 2;
}

function ppf(q, df) {
    return stdtrit(df, q);
}

function detect_anoms(data, _ref) {
    var _ref$k = _ref.k,
        k = _ref$k === undefined ? 0.49 : _ref$k,
        _ref$alpha = _ref.alpha,
        alpha = _ref$alpha === undefined ? 0.05 : _ref$alpha,
        _ref$num_obs_per_peri = _ref.num_obs_per_period,
        num_obs_per_period = _ref$num_obs_per_peri === undefined ? null : _ref$num_obs_per_peri,
        _ref$use_decomp = _ref.use_decomp,
        use_decomp = _ref$use_decomp === undefined ? true : _ref$use_decomp,
        _ref$one_tail = _ref.one_tail,
        one_tail = _ref$one_tail === undefined ? true : _ref$one_tail,
        _ref$upper_tail = _ref.upper_tail,
        upper_tail = _ref$upper_tail === undefined ? true : _ref$upper_tail,
        _ref$verbose = _ref.verbose,
        verbose = _ref$verbose === undefined ? false : _ref$verbose;

    if (num_obs_per_period === null) throw 'must supply period length for time series decomposition';

    var num_obs = data.length;

    if (num_obs < num_obs_per_period * 2) throw 'Anom detection needs at least 2 periods worth of data';

    //run length encode result of isnull, check for internal nulls
    if (function (data) {
        var sliced_data = data.slice(0, -1);
        var null_count = 2;
        for (var idx = 0; idx < sliced_data.length - 1; idx++) {
            if (sliced_data[idx][1] && !sliced_data[idx + 1][1]) {
                null_count += 1;
            }
        }
        return null_count;
    }(data) > 2) {
        throw 'Data contains non-leading NAs. We suggest replacing NAs with interpolated values';
    } else {
        data = data.filter(function (datum) {
            return datum[1];
        });
    }
    var decomp = new _stlnode.STL(data, num_obs_per_period, 'periodic', { robust: true });

    var d = {
        timestamp: data.map(function (datum) {
            return datum[0];
        }),
        value: transpose([data.map(function (datum) {
            return datum[1];
        }), decomp.seasonal]).map(function (t) {
            return t[0] - t[1];
        })
    };

    data = transpose([d.timestamp, d.value]);

    var p = {
        timestamp: data.map(function (datum) {
            return datum[0];
        }),
        value: transpose([decomp.trend, decomp.seasonal]).map(function (t) {
            return t[0] + t[1];
        })
    };
    var data_decomp = transpose([p.timestamp, p.value]);

    var max_outliers = parseInt(num_obs * k);

    if (max_outliers === 0) throw 'With longterm=TRUE, AnomalyDetection splits the data into 2 week periods by default. You have ' + num_obs + ' observations in a period, which is too few. Set a higher piecewise_median_period_weeks.';

    var n = data.length;
    var R_idx = [].concat(_toConsumableArray(Array(max_outliers).keys()));

    var num_anoms = 0;

    var _loop = function _loop(i) {
        var data_med = median(data.map(function (datum) {
            return datum[1];
        }));
        if (one_tail) {
            if (upper_tail) {
                ares = data.map(function (datum) {
                    return [datum[0], datum[1] - data_med];
                });
            } else {
                ares = data.map(function (datum) {
                    return [datum[0], data_med - datum[1]];
                });
            }
        } else {
            ares = data.map(function (datum) {
                return [datum[0], Math.abs(datum[1] - data_med)];
            });
        }

        data_sigma = mad(data.map(function (datum) {
            return datum[1];
        }));

        if (data_sigma === 0) {
            return 'break';
        }

        ares = ares.map(function (are) {
            return [are[0], are[1] / data_sigma];
        });

        R = Math.max.apply(Math, _toConsumableArray(ares.map(function (are) {
            return are[1];
        })));
        temp_max_idx = ares.filter(function (are) {
            return are[1] === R;
        })[0][0];


        R_idx[i - 1] = temp_max_idx;
        data = data.filter(function (datum) {
            return datum[0] !== R_idx[i - 1];
        });

        if (one_tail) {
            p = 1 - alpha / parseFloat(n - i + 1);
        } else {
            p = 1 - alpha / parseFloat(2 * (n - i + 1));
        }

        t = ppf(p, n - i - 1);
        lam = t * (n - i) / parseFloat(Math.sqrt((n - i - 1 + Math.pow(t, 2)) * (n - i + 1)));


        if (R > lam) {
            num_anoms = i;
        }
    };

    for (var i = 1; i < max_outliers + 1; i++) {
        var ares;
        var ares;
        var ares;
        var data_sigma;
        var R;
        var temp_max_idx;
        var p;
        var p;
        var t;
        var lam;

        var _ret = _loop(i);

        if (_ret === 'break') break;
    }

    if (num_anoms > 0) {
        R_idx = R_idx.slice(0, num_anoms);
    } else {
        R_idx = null;
    }
    return {
        anoms: R_idx,
        stl: data_decomp
    };
}

module.exports.detect_anoms = detect_anoms;
//# sourceMappingURL=detect_anoms.js.map