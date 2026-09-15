export const TOOLBOX_HOST = '127.0.0.1';
export const TOOLBOX_PORT = 3460;
export const TOOLBOX_BIND = `${TOOLBOX_HOST}:${TOOLBOX_PORT}`;
/** Chrome/Edge/Firefox resuelven *.localhost a 127.0.0.1, sin editar hosts. */
export const TOOLBOX_URL = `http://toolbox.localhost:${TOOLBOX_PORT}`;
