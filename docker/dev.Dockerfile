# Development image for the panel. It is deliberately not the production
# Dockerfile: the source is mounted rather than copied, so an edit on the host
# is live, and the assets are built outside the container by `yarn watch`.
FROM php:8.3-cli-alpine

RUN apk add --no-cache git unzip libzip-dev mysql-client \
    && docker-php-ext-configure zip \
    && docker-php-ext-install bcmath pdo_mysql zip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /app

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
