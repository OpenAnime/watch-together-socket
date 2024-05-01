import chalk from 'chalk';

export const successText = (message: string) => {
    return `${chalk.bgGreen(' SUCCESS ')} ${message}`;
};

export const infoText = (message: string) => {
    return `${chalk.bgBlue(' INFO ')} ${message}`;
};

export const warnText = (message: string) => {
    return `${chalk.bgYellow(' WARN ')} ${message}`;
};

export const errorText = (message: string) => {
    return `${chalk.bgRed(' ERROR ')} ${message}`;
};

export const success = (message: string) => {
    console.log(successText(message));
};

export const info = (message: string) => {
    console.log(infoText(message));
};

export const warn = (message: string) => {
    console.log(warnText(message));
};

export const error = (message: string) => {
    console.log(errorText(message));
};
