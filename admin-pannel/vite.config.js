import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({

  //  change or remove this base on others app     
  base: '/RonginLiveNewUpdatedAdminPanel3dhdie78/', 


  plugins: [react()],
   resolve: {
    alias: {
      parse: "parse/dist/parse.js",
    },
  },
})
