import axios from 'axios';

const { apiHost = '' } = window.kovaa-labConfig || {};
const wootAPI = axios.create({ baseURL: `${apiHost}/` });

export default wootAPI;
