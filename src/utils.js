import axios from 'axios'

export const ComponentEnum = {
    SELECT: {
        NAME: 'el-select',
        OPTION: 'el-option'
    },
    DATE_PICKER: {
        NAME: 'el-date-picker'
    },
    RADIO: {
        NAME: 'el-radio-group',
        OPTION: 'el-radio'
    }
}

export const request = axios.create({
    baseURL: '', // url = base url + request url
    // withCredentials: true, // send cookies when cross-domain requests
    timeout: 5000 // request timeout
})