import { Auth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {getFirestore,query,getDocs,collection,where, addDoc,Firestore} from "firebase/firestore";
import { Database } from "firebase/database";
import GoogleButton from "react-google-button";

interface Props {
    auth: Auth;
    db: Firestore;
}

export const SignInButton = ({ auth, db }: Props) => {
    const googleProvider = new GoogleAuthProvider();
    const signInWithGoogle = async () => {
        try {
          const res = await signInWithPopup(auth, googleProvider);
          const user = res.user;
          const q = query(collection(db, "users"), where("uid", "==", user.uid));
          const docs = await getDocs(q);
          if (docs.docs.length === 0) {
            await addDoc(collection(db, "users"), {
              uid: user.uid,
              name: user.displayName,
              authProvider: "google",
              email: user.email,
            });
          }
        } catch (err) {
          console.error(err);
        }
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