import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';
const OAuth2 = google.auth.OAuth2;
import EmailTemplates = require('swig-email-templates');
import { AllHtmlEntities } from 'html-entities';
const entities = new AllHtmlEntities();
import * as config from '../../config/config';
import { DOCX_CONTENT_TYPE, GMAIL_SERVICE, OAUTH2_TYPE } from '../common/constants';
import * as path from 'path';
const conf = config[process.env.NODE_ENV || 'development'];

export class MailService {
    public ClientId;
    public PlaygroundURL;
    public ClientSecret;
    public refreshToken;
    public smtpUser;

    constructor() {
        this.ClientId = conf.smtp.ClientId;
        this.PlaygroundURL = conf.smtp.Url;
        this.ClientSecret = conf.smtp.ClientSecret;
        this.refreshToken = conf.smtp.refresh_token;
        this.smtpUser = conf.smtp.smtpUser;
    }

    public sendUserMail(
        email: string,
        userName: string,
        method: string,
        message?: string,
        filePath?: string,
        fileName?: string,
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const oauth2Client = new OAuth2(
                this.ClientId,
                this.ClientSecret,
                this.PlaygroundURL,
            );

            oauth2Client.setCredentials({ refresh_token: this.refreshToken });

            oauth2Client
                .refreshAccessToken()
                .then(res => {
                    return res.credentials.access_token;
                })
                .then(accessToken => {
                    const smtpTransport = nodemailer.createTransport({
                        service: GMAIL_SERVICE,
                        auth: {
                            type: OAUTH2_TYPE,
                            user: this.smtpUser,
                            clientId: this.ClientId,
                            clientSecret: this.ClientSecret,
                            refreshToken: this.refreshToken,
                            accessToken,
                        },
                    });

                    const templates = new EmailTemplates();
                    const templateName = method;
                    const context = {
                        user_name: userName,
                        message: message ? message : 'Пользователь не оставил сообщения.',
                    };

                    templates.render(
                        path.resolve(__dirname + `/templates/${templateName}.html`),
                        context,
                        (err, html) => {
                            const mailOptions = {
                                from: this.smtpUser,
                                to: email,
                                subject: 'Reference system CFU: document sharing',
                                generateTextFromHTML: true,
                                html: entities.decode(html),
                                attachments: [
                                    {
                                        filename: `${fileName}`,
                                        path: filePath,
                                        contentType: DOCX_CONTENT_TYPE,
                                    },
                                ],
                            };

                            smtpTransport.sendMail(
                                mailOptions,
                                (error: any, response: any) => {
                                    if (error) {
                                        console.log(error);
                                        reject(error);
                                    } else {
                                        console.log(response);
                                        smtpTransport.close();
                                        resolve(response);
                                    }
                                },
                            );
                        },
                    );
                })
                .catch((error) => {
                    console.log(error);
                    reject(error);
                });
        });
    }
}

export let mailService = new MailService();
