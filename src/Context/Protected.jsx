import { useContext } from "react";
import { Context } from "./UserAuthContext";
import { Navigate } from "react-router-dom"

export function Protected({children}) {
    const {user} = useContext(Context)

    if (!user) {
        return <Navigate to="/Login" />
    } else {
        return children;
    }
}