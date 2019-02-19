'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _date_utils = require('./date_utils');

var _detect_anoms = require('./detect_anoms');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function median(x) {
    var t_x = x.slice(0).sort(function (a, b) {
        return a - b;
    });
    return t_x[parseInt(t_x.length / 2)];
}

function quantile(x, q) {
    var t_x = x.slice(0).sort(function (a, b) {
        return a - b;
    });
    var idx = Math.round(t_x.length * q);
    return t_x[idx];
}

function detect_ts(df, _ref) {
    var _ref$max_anoms = _ref.max_anoms,
        max_anoms = _ref$max_anoms === undefined ? 0.10 : _ref$max_anoms,
        _ref$direction = _ref.direction,
        direction = _ref$direction === undefined ? 'pos' : _ref$direction,
        _ref$alpha = _ref.alpha,
        alpha = _ref$alpha === undefined ? 0.05 : _ref$alpha,
        _ref$only_last = _ref.only_last,
        only_last = _ref$only_last === undefined ? null : _ref$only_last,
        _ref$threshold = _ref.threshold,
        threshold = _ref$threshold === undefined ? null : _ref$threshold,
        _ref$e_value = _ref.e_value,
        e_value = _ref$e_value === undefined ? false : _ref$e_value,
        _ref$longterm = _ref.longterm,
        longterm = _ref$longterm === undefined ? false : _ref$longterm,
        _ref$piecewise_median = _ref.piecewise_median_period_weeks,
        piecewise_median_period_weeks = _ref$piecewise_median === undefined ? 2 : _ref$piecewise_median,
        _ref$plot = _ref.plot,
        plot = _ref$plot === undefined ? false : _ref$plot,
        _ref$y_log = _ref.y_log,
        y_log = _ref$y_log === undefined ? false : _ref$y_log,
        _ref$xlabel = _ref.xlabel,
        xlabel = _ref$xlabel === undefined ? '' : _ref$xlabel,
        _ref$ylabel = _ref.ylabel,
        ylabel = _ref$ylabel === undefined ? 'count' : _ref$ylabel,
        _ref$title = _ref.title,
        title = _ref$title === undefined ? null : _ref$title,
        _ref$verbose = _ref.verbose,
        verbose = _ref$verbose === undefined ? false : _ref$verbose;

    if (!Array.isArray(df)) {
        throw 'data must be a single data frame';
    } else {
        if (df[0].length != 2 || !df.map(function (row) {
            return row[1];
        }).filter(function (col) {
            return Number.isFinite(col);
        }).length) {
            throw 'data must be a 2 column data.frame, with the first column being a set of timestamps, and the second coloumn being numeric values.';
        }
    }
    if (max_anoms > 0.49) {
        length = len(df);
        throw 'max_anoms must me less then 50% of the data points (max_anoms =' + max_anoms * length + ' data_points =' + length;
    }

    if (!['pos', 'neg', 'both'].includes(direction)) {
        throw 'direction options are: pos | neg | both.';
    }

    if (!(0.01 <= alpha || alpha <= 0.1)) {
        if (verbose) console.warn('alpha is the statistical signifigance and is usually between 0.01 and 0.1');
    }

    if (only_last && !['day', 'hr'].includes(only_last)) {
        throw 'only_last must be either \'day\' or \'hr\'';
    }

    if (![null, 'med_max', 'p95', 'p99'].includes(threshold)) {
        throw 'threshold options are: None | med_max | p95 | p99';
    }

    if (!(typeof e_value === 'undefined' ? 'undefined' : _typeof(e_value)) === 'boolean') {
        throw 'e_value must be a boolean';
    }

    if (!(typeof longterm === 'undefined' ? 'undefined' : _typeof(longterm)) === 'boolean') {
        throw 'longterm must be a boolean';
    }

    if (piecewise_median_period_weeks < 2) {
        throw 'piecewise_median_period_weeks must be at greater than 2 weeks';
    }

    if (!(typeof plot === 'undefined' ? 'undefined' : _typeof(plot)) === 'boolean') {
        throw 'plot must be a boolean';
    }

    if (!(typeof y_log === 'undefined' ? 'undefined' : _typeof(y_log)) === 'boolean') {
        throw 'y_log must be a boolean';
    }

    if (!(typeof xlabel === 'undefined' ? 'undefined' : _typeof(xlabel)) === 'string') {
        throw 'xlabel must be a string';
    }

    if (!(typeof ylabel === 'undefined' ? 'undefined' : _typeof(ylabel)) === 'string') {
        throw 'ylabel must be a string';
    }

    if (!(typeof title === 'undefined' ? 'undefined' : _typeof(title)) === 'string') {
        throw 'title must be a string';
    }

    if (!title) {
        title = '';
    } else title = title + ':';

    var gran = (0, _date_utils.get_gran)(df);

    if (gran === 'day') {
        var num_days_per_line = 7;
        if (typeof only_last === 'string' && only_last === 'hr') {
            only_last = 'day';
        }
    } else {
        var num_days_per_line = 1;
    }

    if (gran === 'sec') {
        var min_df = df.map(function (row) {
            return [new Date(new Date(row[0]).toISOString().substr(0, 16) + ":00").toISOString(), row[1]];
        });
        var agg_df = {};
        min_df.forEach(function (row) {
            agg_df[row[0]] ? agg_df[row[0]] += row[1] : agg_df[row[0]] = row[1];
        });
        df = Object.keys(agg_df).map(function (key) {
            return [key, agg_df[key]];
        }).sort();
    }

    var gran_perod = {
        'min': 1440,
        'hr': 24,
        'day': 7
    };
    var period = gran_perod[gran];
    if (!period) {
        throw gran + ' granularity detected. This is currently not supported.';
    }
    var num_obs = df.length;

    var clamp = 1 / num_obs;
    if (max_anoms < clamp) {
        max_anoms = clamp;
    }

    if (longterm) {
        if (gran === 'day') {
            var num_obs_in_period = period * piecewise_median_period_weeks + 1;
            var num_days_in_period = 7 * piecewise_median_period_weeks + 1;
        } else {
            var num_obs_in_period = period * 7 * piecewise_median_period_weeks;
            var num_days_in_period = 7 * piecewise_median_period_weeks;
        }

        var last_date = df.slice(-1)[0][0];

        var all_data = [];

        for (var j = 0; j < df.length; j += num_obs_in_period) {
            var start_date = new Date(df[j][0]);
            var end_date = new Date(Math.min(start_date.getTime() + 1000 * 60 * 60 * 24 * num_days_in_period, new Date(df.slice(-1)[0][0]).getTime()));

            if (Math.floor((end_date - start_date) / (1000 * 60 * 60 * 24)) === num_days_in_period) {
                var sub_df = df.filter(function (row) {
                    return new Date(row[0]) >= start_date && new Date(row[0]) < end_date;
                });
            } else {
                var sub_df = df.filter(function (row) {
                    return new Date(row[0]) > new Date(last_date.getTime() - 1000 * 60 * 60 * 24 * num_days_in_period) && new Date(row[0]) <= last_date;
                });
            }
            all_data.push(sub_df);
        }
    } else {
        var all_data = [df];
    }

    var all_anoms = [];
    var seasonal_plus_trend = [];

    for (var i in all_data) {
        var directions = {
            pos: { one_tail: true, upper_tail: true },
            neg: { one_tail: true, upper_tail: false },
            both: { one_tail: false, upper_tail: false }
        };
        var anomaly_direction = directions[direction];

        var s_h_esd_timestamps = (0, _detect_anoms.detect_anoms)(all_data[i], { k: max_anoms, alpha: alpha, num_obs_per_period: period, use_decomp: true,
            one_tail: anomaly_direction.one_tail, upper_tail: anomaly_direction.upper_tail, verbose: verbose });

        var data_decomp = s_h_esd_timestamps.stl;
        s_h_esd_timestamps = s_h_esd_timestamps.anoms;

        if (s_h_esd_timestamps) {
            var anoms = all_data[i].filter(function (datum) {
                return s_h_esd_timestamps.indexOf(datum[0]) !== -1;
            });
        } else {
            var anoms = [];
        }

        if (threshold) {
            var date_group = {};
            df.forEach(function (d) {
                var date_string = new Date(d[0]).toLocaleDateString();
                if (!date_group[date_string]) date_group[date_string] = [d[1]];else date_group[date_string].push(d[1]);
            });
            var periodic_maxes = Object.keys(date_group).map(function (date) {
                return [date, Math.max.apply(Math, _toConsumableArray(date_group[date]))];
            });
            if (threshold === 'med_max') {
                var thresh = median(periodic_maxes.map(function (max) {
                    return max[1];
                }));
            } else if (threshold === 'p95') {
                var thresh = quantile(periodic_maxes.map(function (max) {
                    return max[1];
                }), .95);
            } else if (threshold === 'p99') {
                var thresh = quantile(periodic_maxes.map(function (max) {
                    return max[1];
                }), .99);
            }
            anoms = anoms.filter(function (anom) {
                return anom[1] >= thresh;
            });
        }

        all_anoms = all_anoms.concat(anoms);
        seasonal_plus_trend = seasonal_plus_trend.concat(data_decomp);
    }

    if (only_last) {
        var start_date = new Date(df.slice(0).sort(function (a, b) {
            return new Date(a[0]) - new Date(b[0]);
        }).slice(-1)[0][0]);
        start_date.setDate(start_date.getDate() - 7);
        var start_anoms = new Date(df.slice(0).sort(function (a, b) {
            return new Date(a[0]) - new Date(b[0]);
        }).slice(-1)[0][0]);
        start_anoms.setDate(start_anoms.getDate() - 1);

        if (gran === 'day') {
            var breaks = 3 * 12;
            num_days_per_line = 7;
        } else {
            if (only_last === 'day') {
                var breaks = 12;
            } else {
                start_date = new Date(df.slice(0).sort(function (a, b) {
                    return new Date(a[0]) - new Date(b[0]);
                }).slice(-1)[0][0]);
                start_date.setDate(start_date.getDate() - 2);
                start_date = new Date(start_date.toDateString());
                start_anoms = new Date(df.slice(0).sort(function (a, b) {
                    return new Date(a[0]) - new Date(b[0]);
                }).slice(-1)[0][0]);
                start_anoms.setHours(start_anoms.getHours() - 1);
                var breaks = 3;
            }
        }

        var x_subset_single_day = df.filter(function (d) {
            return new Date(d[0]) > start_anoms;
        }).slice(0).sort(function (a, b) {
            return new Date(a[0]) - new Date(b[0]);
        });
        var x_subset_week = df.filter(function (d) {
            return new Date(d[0]) <= start_anoms && new Date(d[0]) > start_date;
        });

        if (all_anoms.length > 0) {
            all_anoms = all_anoms.filter(function (anom) {
                return new Date(anom[0]) >= new Date(x_subset_single_day[0][0]);
            });
        }
        num_obs = x_subset_single_day.length;
    }

    var anom_pct = df.length / parseFloat(num_obs) * 100;

    if (anom_pct === 0.) {
        return {
            anoms: null,
            plot: null
        };
    }

    if (e_value) {
        var exp_val = seasonal_plus_trend.filter(function (st) {
            return all_anoms.map(function (anom) {
                return anom[0];
            }).indexOf(st[0]) !== -1;
        }).map(function (st) {
            return st[1];
        });
        var d = all_anoms.map(function (a, idx) {
            return {
                timestamp: a[0],
                anom: a[1],
                expected_value: exp_val[idx]
            };
        });
    } else {
        var d = all_anoms.map(function (a) {
            return {
                timestamp: a[0],
                anom: a[1]
            };
        });
    }

    return {
        anoms: d,
        plot: null
    };
}

module.exports = detect_ts;
//# sourceMappingURL=detect_ts.js.map