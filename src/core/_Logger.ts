import logger from "../core/logger";

export default class _Logger {
    public name: string;
    public text: string;

    constructor(name: string, text: string) {
        this.name = name;
        this.text = text;
    }
}
