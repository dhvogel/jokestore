import { Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import GoogleButton from "react-google-button";

interface Props {
    auth: Auth;
}

export const SignInButton = ({ auth }: Props) => {
    const signInWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider);
    };

    return (
        <>
            <p>
                Jokestore - Sign in
            </p>
            <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <GoogleButton 
                    onClick={signInWithGoogle} 
                    className="sign-in"
                />
            </div>

        </>
    )
};