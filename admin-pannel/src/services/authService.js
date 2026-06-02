import Parse from "../parseConfig";

// LOGIN
export const loginAdmin = async (username, password) => {

  const user = await Parse.User.logIn(username, password);

  if (user.get("role") !== "admin") {
    await Parse.User.logOut();
    throw new Error("You are not admin");
  }

  return user;
};


// LOGOUT
export const logoutAdmin = async () => {
  await Parse.User.logOut();
};


// CURRENT USER
export const getCurrentUser = () => {
  return Parse.User.current();
};


// CHANGE USERNAME
export const updateUsername = async (newUsername) => {

  const user = Parse.User.current();

  user.set("username", newUsername);

  await user.save();
};


// CHANGE PASSWORD
export const updatePassword = async (newPassword) => {

  const user = Parse.User.current();

  user.set("password", newPassword);

  await user.save();
};