FROM nginx:alpine

COPY services/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY services/dashboard/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
