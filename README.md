# s-h-esd
A Node port of Seasonal Hybrid ESD (S-H-ESD), Twitter's AnomalyDetection.

# Usage

|timestamp|count|
|---------|-----|
|1980-09-25 14:01:00|182.478|
|1980-09-25 14:02:00|176.231|
|1980-09-25 14:03:00|183.917|
|1980-09-25 14:04:00|177.798|
|1980-09-25 14:05:00|165.469|
|...|...|

```
const detect_ts = require('s-h-esd');
var df = [['1980-09-25 14:01:00', 182.478], ['1980-09-25 14:02:00', 176.231], ...]
var result = detect_ts(df, {max_anoms:0.02, direction:'both', only_last:'day', e_value: true, verbose:true})
```
