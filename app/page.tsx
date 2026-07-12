import updateFinalScore from "./components/updateFinalScore"
import scores from "./components/updateFinalScore"

export default async function Page() {
  await updateFinalScore("Bitcoin")
  return (
    <>
      <h1>Hello World </h1>
    </>
  )
}