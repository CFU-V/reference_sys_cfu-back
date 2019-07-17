export default class Utils {

  public static getRandomFileName(): any {
    return Array(32)
      .fill(null)
      .map(() => {
        return (Math.round(Math.random() * 16)).toString(16);
      }).join('');
  }
}
