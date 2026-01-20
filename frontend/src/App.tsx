//import {Greet} from "../wailsjs/go/main/App";
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "./components/mode-toogle"

function App() {
    return (
         <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <ModeToggle/>

        <h1 className="text-3xl font-bold underline">
    Hello world!
  </h1>
    </ThemeProvider>
       
    )
}

export default App
