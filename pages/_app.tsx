import '../styles/globals.css';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';

let triggerRerender;
// import App from '../components/multi-select'

const App = dynamic(
  () => import('../components/multi-select'),
  { ssr: false }
)

function MyApp({ Component, pageProps }) {
  const [key, setKey] = useState(0);
  triggerRerender = () => {
    setKey((prevKey) => prevKey + 1);
    window.location.reload();
  };
  return <>
    <App {...pageProps}>
      <Component {...pageProps} />
    </App>
  </>
}

export default MyApp
export { triggerRerender };
