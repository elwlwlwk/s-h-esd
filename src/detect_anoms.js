import {STL} from 'stlnode';

const libR = require('lib-r-math.js');
const {
  StudentT,
  rng: { MarsagliaMultiCarry },
  rng: { normal: { AhrensDieter } } 
} = libR;
 
//*.Uses default argument "Normal()".
//*.Normal itself using default arguments.
const defaultT = StudentT();
 
//explicit use of PRNG's
const mmc = new MarsagliaMultiCarry(0);
const ad = new AhrensDieter(mmc);
 
//*create explicit functions
const explicitT = StudentT(ad);
 
const { pt } = explicitT;

function transpose(m) { return m[0].map((x,i) => m.map(x => x[i])) };

function median(x) {
    var t_x = x.slice(0).sort( (a,b) => a-b );
    return t_x[parseInt(t_x.length/2)];
}

function mad(x, c=0.6744897501960817) {
    var med = median(x);
    return median(x.map( (x) => Math.abs(x - med) ))/c;
}

function erf(xe){
    var eres=new Array();
    var xet=new Array();
    var sume=0;
    var c=new Array();
    c[0]=0; c[1]=-2/Math.sqrt(Math.PI); c[2]=-6.366197121956e-1; c[3]=-1.027728162129e-1; c[4]=1.912427299414e-2; c[5]=2.401479235527e-4;
    c[6]=-1.786242904258e-3;c[7]=7.336113173091e-4;c[8]=-1.655799102866e-4;c[9]=2.116490536557e-5;c[10]=-1.96623630319e-6;
    var xsqr;
    if (xe.constructor != Array) {xet=new Array(1); xet[0]=xe; eres[0]=0;}
    else {for (var ie=0;ie<xe.length;ie++) { eres[ie]=0; xet[ie]=parseFloat(xe[ie]);}}
    for (var ie=0;ie<xet.length;ie++) {
        var sgn=1;
        if (xet[ie]<0) sgn=-1;
        sume=0
        for (var je=1;je<c.length;je++){
            sume=sume+c[je]*Math.pow(Math.abs(xet[ie]),je);
        }
        eres[ie]=sgn*(1-Math.exp(sume))*1;
    }
    return eres;
}

function stdtrit(df, q) {
    var large = 100;
    var small = 0;
    for(let i=0; i< 30; i++) {
        if(pt(small + (large-small)/2, df) > q) {
            large -= (large-small)/2;
        } else {
            small += (large-small)/2;
        }
    }
    return (large+small)/2;
}

function ppf(q, df) {
    return stdtrit(df, q);
}

function detect_anoms(data, {k=0.49, alpha=0.05, num_obs_per_period=null,
                      use_decomp=true, one_tail=true,
                      upper_tail=true, verbose=false}
) {
    if(num_obs_per_period === null) throw 'must supply period length for time series decomposition';

    var num_obs = data.length;

    if(num_obs < num_obs_per_period * 2) throw 'Anom detection needs at least 2 periods worth of data';

    //run length encode result of isnull, check for internal nulls
    if(((data) => {
        var sliced_data = data.slice(0, -1);
        var null_count = 2;
        for(let idx=0; idx<sliced_data.length-1; idx++){
            if(sliced_data[idx][1] && !sliced_data[idx+1][1]) {
                null_count += 1;
            }
        }
        return null_count;
    })(data) > 2) {
        throw 'Data contains non-leading NAs. We suggest replacing NAs with interpolated values';
    } else {
        data = data.filter( (datum) => datum[1] );
    }
    var decomp = new STL(data, num_obs_per_period, 'periodic', {robust: true});

    var d = {
        timestamp: data.map( datum => datum[0] ),
        value: transpose([data.map( datum => datum[1] ), decomp.seasonal]).map( (t) => t[0] - t[1] )
    }

    data = transpose([d.timestamp, d.value]);

    var p = {
        timestamp: data.map( datum => datum[0] ),
        value: transpose([decomp.trend, decomp.seasonal]).map( (t) => t[0] + t[1] )
    }
    var data_decomp = transpose([p.timestamp, p.value]);

    var max_outliers = parseInt(num_obs * k);

    if(max_outliers === 0) throw `With longterm=TRUE, AnomalyDetection splits the data into 2 week periods by default. You have ${num_obs} observations in a period, which is too few. Set a higher piecewise_median_period_weeks.`;

    var n = data.length;
    var R_idx = [...Array(max_outliers).keys()];

    var num_anoms = 0;

    for(let i=1; i<max_outliers+1; i++) {
        let data_med = median(data.map( (datum) => datum[1] ));
        if(one_tail) {
            if(upper_tail) {
                var ares = data.map( (datum) => [datum[0], datum[1] - data_med] );
            } else {
                var ares = data.map( (datum) => [datum[0], data_med - datum[1]] );
            }
        } else {
            var ares = data.map( (datum) => [datum[0], Math.abs(datum[1] - data_med)] );
        }

        var data_sigma = mad(data.map( (datum) => datum[1] ));
        if(data_sigma === 0) {
            break;
        }

        ares = ares.map( (are) => [are[0], are[1] / data_sigma] );

        var R = Math.max(...ares.map( (are) => are[1] ));

        var temp_max_idx = ares.filter( (are) => are[1] === R )[0][0];

        R_idx[i-1] = temp_max_idx;
        data = data.filter( (datum) => datum[0] !== R_idx[i-1] )

        if(one_tail) {
            var p = 1 - alpha / parseFloat(n - i + 1);
        } else {
            var p = 1 - alpha / parseFloat(2 * (n - i + 1));
        }

        var t = ppf(p, n - i - 1);
        var lam = t * (n - i) / parseFloat(Math.sqrt((n - i - 1 + Math.pow(t, 2)) * (n - i + 1)));

        if(R > lam) {
            num_anoms = i;
        }
    }

    if(num_anoms > 0) {
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