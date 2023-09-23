/**
 * utitle to extract error message from axios error and other error
 */
import axios from "axios";

export const getAxiosErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return (error.response.data as any).msg || error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      return error.request.toString();
    } else {
      // Something happened in setting up the request that triggered an Error
      return error.message;
    }
  } else {
    return getErrorMessage(error);
  }
};
