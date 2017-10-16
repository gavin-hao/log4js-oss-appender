# log4js-appender-oss
log4js appender ,upload files to aliyun oss

## usage

config log4js appender

``` js
log4js.configure({
    appenders: {
        trace: {
            type: 'log4js-appender-oss', filename: '.log/trace.log', rollingTime: 30000, maxLogSize: 1048576,
            oss: {
                accessKeyId: 'your access key',
                accessKeySecret: 'your access secret',
                bucket: 'your bucket name',
                region: 'oss-cn-beijing',
                basePath: 'dev/trace_log'
            }, pattern: '.yyyy-MM-dd-hh-mm', compress: false,
            layout: { type: 'eventTracker', separator: '' }
        },
        track: { type: 'logLevelFilter', level: 'trace', maxLevel: 'trace', appender: 'trace' }

    },
    categories: {
        tracker: { appenders: ['trace'], level: 'trace' }
    }
});
```
