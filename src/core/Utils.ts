import * as fs from 'fs';

export default class Utils {

  public static getRandomFileName(): any {
    return Array(32)
      .fill(null)
      .map(() => {
        return (Math.round(Math.random() * 16)).toString(16);
      }).join('');
  }

  public static deleteIfExist(docPath): any {
      if (fs.existsSync(docPath)) {
          fs.unlinkSync(docPath);
      }
  }

  public static prettify(str: string): string {
    return str.trim().replace(/\s|\s+/g, '');
  }

  public static fileNameTemplate(str: string): string {
    return str.trim().replace(/\s|\s+/g, '_') + '.docx';
  }
}
