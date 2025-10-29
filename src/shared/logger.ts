import { inspect } from 'node:util';
import { LEVEL, MESSAGE, SPLAT } from 'triple-beam';
import winston from 'winston';

const INSPECT_DEFAULTS = { colors: true, compact: true, breakLength: Infinity };

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({
      filename: 'combined.log',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'HH:mm:ss',
        }),
        //winston.format.align(),
        winston.format.printf(({ level, message, context, timestamp, ...meta }) => {
          const formattedMessage =
            typeof message === 'object' ? inspect(message, INSPECT_DEFAULTS) : message;

          const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            [LEVEL]: _level,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            [MESSAGE]: _message,
            [SPLAT]: _splat,
            ...restMeta
          } = meta;

          const splattedArgs: unknown[] =
            (_splat as unknown[] | undefined)?.filter((v) => typeof v !== 'object' || v === null) ??
            [];

          const splatted =
            splattedArgs.length > 1
              ? `\n${inspect(splattedArgs, INSPECT_DEFAULTS)}`
              : splattedArgs.length === 1
                ? ` ${inspect(splattedArgs[0], INSPECT_DEFAULTS)}`
                : '';
          const metaString = Object.keys(restMeta).length
            ? `\n${inspect(restMeta, INSPECT_DEFAULTS)}`
            : '';

          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions,@typescript-eslint/no-base-to-string
          return `${timestamp} [${level}]${context ? `[${context}]` : ''}: ${formattedMessage}${splatted}${metaString}`;
        }),
      ),
    }),
  ],
});

export default logger;
