import getTeamScore from "./utils/getTeamScore"
import GoogleLoginButton from "./components/googleLoginButton"
export default async function Page() {
  await getTeamScore("Bitcoin")
 
  return (
    <>
      <h1>Hello World </h1>

      {/* Will be implemented after everything is completed */}
      {/* <GoogleLoginButton/>   */}
      
    </>
  )
}