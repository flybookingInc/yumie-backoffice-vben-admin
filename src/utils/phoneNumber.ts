export const taiwanNationCodeFilter = (phoneNumber: string): string => {
  if (!phoneNumber) return "";
  let pos;
  if ((pos = phoneNumber.indexOf("+886")) !== -1) {
    phoneNumber = phoneNumber.slice(pos + 4, phoneNumber.length);
  }
  if (phoneNumber.length < 10) {
    phoneNumber = "0" + phoneNumber;
  }
  return phoneNumber;
};

/**
 * Convert phone number to Taiwan nation code format
 * @example 0963382930 => +886963382930
 * @param phoneNumber The phone number
 * @returns The phone number in Taiwan nation code format
 */
export const taiwanNationCodeFormatter = (phoneNumber: string): string => {
  if (!phoneNumber) throw Error("Phone number is empty");
  if (phoneNumber.length !== 10) {
    throw Error("Phone number length is not 10");
  }
  if (phoneNumber.substring(0, 2) !== "09") {
    throw Error("Phone number should begin with 09");
  }
  return "+886" + phoneNumber.substring(1, phoneNumber.length);
};

/**
 * remove leading zeros of Taiwan phone number
 * @example +8860963382930 => +886963382930
 * @param input The input phone number with leading zeros
 * @returns The phone number without leading zeros
 */
export function removeLeadingZerosOfPhoneNumber(input: string): string {
  console.log("input phone number =", input);
  if (input.length < 13 || input.length > 14) {
    // If the input is less than 14 characters (e.g., just a "+886963382930"), return input string.
    throw new Error(`Phone number length is incorrect. phoneNumber=${input}`);
  }
  if (input.substring(0, 4) === "+886" && input.substring(4, 5) === "0") {
    // If the input is not a Taiwan phone number, return input string.
    // Remove leading zeros of the phone number.
    return "+886" + input.substring(5, input.length);
  }
  if (input.substring(0, 3) === "+86" && input.substring(3, 4) === "0") {
    // If the input is not a Taiwan phone number, return input string.
    // Remove leading zeros of the phone number.
    return "+86" + input.substring(4, input.length);
  }
  throw new Error("Phone number is not a Taiwan or China phone number");
}
