import bcrypt from "bcrypt";

// function for hashing passwords
export const hashedPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  return hashed;
};

// function for computing passwords
export const comparePassword = async (password, dbPassword) => {
  return await bcrypt.compare(password, dbPassword);
};
