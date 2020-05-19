const winston = require('winston');

const logger = winston.createLogger({
	level: 'info',
	transports: [
		new winston.transports.File({ filename: 'combined.log' }),
	],
});

if (process.env.NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.simple(),
	}));
}

class loggerInterface {
	static error(...inputs) {
		logger.error(loggerInterface.process(inputs));
	}

	static log(...inputs) {
		logger.info(loggerInterface.process(inputs));
	}

	static process(inputs) {
		const msg = [];
		inputs.reduce((prev, curr) => {
			switch (typeof curr) {
			case 'object':
			case 'array':
				prev.push(JSON.stringify(curr));
				break;
			case 'boolean':
				prev.push((curr ? 'TRUE' : 'FALSE'));
				break;
			default:
				prev.push(curr);
				break;
			}
			return prev;
		}, msg);
		return msg.join(' ');
	}
}

module.exports = loggerInterface;
