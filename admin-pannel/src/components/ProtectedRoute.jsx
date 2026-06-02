import React from "react";
import Parse from "../parseConfig";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {

  const user = Parse.User.current();

  if (!user) {

    return <Navigate to="/login" />;

  }

  return children;

}

export default ProtectedRoute;