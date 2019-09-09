module.exports = {
  apps : [{
    name: 'CFU Reference API',
    script: 'dist/src/main.js',
    args: null,
    instances: 3,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
