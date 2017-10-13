const log4js = require('log4js');

log4js.addLayout('eventTracker', function (config) {
    return function (logEvent) {
        // console.log('======>', logEvent)
        var eventData = [];

        logEvent.data.forEach(function (item) {

            if (item instanceof Error) {
                var error = {
                    is_error: true,
                    message: item.message,
                    code: item.code,
                    stack: item.stack
                };

                eventData.push(error);
            } else {
                eventData.push(item);
            }

        });
        var event = {
            time: logEvent.startTime.getTime(),
            context:logEvent.context,
            // level_int: logEvent.level.level,
            // level: logEvent.level.levelStr,
            data: eventData
        };
        return JSON.stringify(event) + config.separator;
    }
});
log4js.configure({
    appenders: {
        muti: {
            type: 'multiFile', base: '.log/', property: 'categoryName', extension: '.log',
            maxLogSize: 10485760, backups: 3, compress: false
        },
        app: { type: 'dateFile', filename: '.log/app.log', layout: { type: 'basic' } },
        trace: {
            type: './index', filename: '.log/trace.log', rollingTime: 30000, maxLogSize: 1048576,
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
        default: { appenders: ['app', 'muti'], level: 'debug' },
        tracker: { appenders: ['trace'], level: 'trace' }
    }
});

var logger = log4js.getLogger('tracker');

logger.addContext('clazz', { class_id: 'asdjshfjh', cls_type: '暑期小学4年级数学提高班', lecture: 2, area: 010 });
logger.addContext('teacher', { name: '张三', area: '010', id: '21345678' })

logger.trace('trace');
logger.debug('debug');
logger.info('info');
logger.warn('warn');
var error = new Error('test');
error.code = 'fatal';
logger.error(error);
logger.fatal('fatal');
logger.mark('mark');

var log=log4js.getLogger();
log.error(new Error('test'))