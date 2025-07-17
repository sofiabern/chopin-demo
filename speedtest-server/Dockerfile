FROM openspeedtest/latest

# Copy the custom HTML files from the parent directory into the container
COPY public/openspeedtest-custom/index.html /usr/share/nginx/html/index.html

# Copy the modified JavaScript file with postMessage code
COPY public/openspeedtest-custom/assets/js/app-2.5.4.js /usr/share/nginx/html/assets/js/app-2.5.4.js


COPY public/openspeedtest-custom/assets/css/custom.css /usr/share/nginx/html/assets/css/custom.css
# Expose both HTTP and HTTPS ports
EXPOSE 3000 3001
