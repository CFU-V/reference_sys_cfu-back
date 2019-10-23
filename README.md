## Description
![alt text](./public/cfu-logo.png)

Rest API of a CFU Reference System.

## Installation

```bash
$ sudo apt-get update && sudo apt-get install -y xpdf
$ pdftotext_path='/usr/bin';
$ sudo /opt/bitnami/ctlscript.sh restart apache
$ npm install
```

## DB migrations

If you haven't created db yet run following command  
Make sure you have correct credentials for db in the file config/config.json
  
```bash
$ node_modules/.bin/sequelize db:create
```

```bash
# create
$ node_modules/.bin/sequelize migration:create --name your_name

# run
node_modules/.bin/sequelize db:migrate

# rollback
node_modules/.bin/sequelize db:migrate:undo

# seed
node_modules/.bin/sequelize seed:create --name your_name

node_modules/.bin/sequelize db:seed:all

node_modules/.bin/sequelize db:seed --seed name

node_modules/.bin/sequelize db:seed:undo:all

node_modules/.bin/sequelize db:seed:undo --seed name

```


## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run prestart:prod
$ npm run start:prod
```


## Test

```bash
# unit tests
$ npm run test

# test coverage
$ npm run test:cov
```

## Support

- Author - Edem Devlet / devlet.seran@gmail.com
