import { ViteReactSSG } from "vite-react-ssg";
import { routes } from "./routes.jsx";

export const createRoot = ViteReactSSG({ routes });
