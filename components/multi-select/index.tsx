import React, { useEffect, useState } from 'react';

import { Card, CardContent, Dialog, Divider, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
// import './App.css';
import Stack from '@mui/material/Stack';

import amplienceSDK from '../../lib/sdk';
import { Utils } from '../../lib/util';
import AutoCompleteMultiple from '../AutoCompleteMultiple/AutoCompleteMultiple';
import AutoCompleteSingle from '../AutoCompleteSingle/AutoCompleteSingle';
import ProductSelector from '../ProductSelector';
import TreeViewSingle from '../TreeViewSingle/TreeViewSingle';

function App() {
    const [ampSDK, setAmpSDK] = useState<any>(undefined)
    const [errorText, setErrorText] = useState<any>(undefined)

    useEffect(() => {
        amplienceSDK().then(setAmpSDK).catch((e) => {
            setErrorText(Utils.errorToString(e))
        })
    }, [ampSDK])

    let component = <></>

    if (errorText) {
        component = <Dialog open={true}>
            <Card variant='outlined'>
                <CardContent style={{whiteSpace: "pre-wrap"}}>{errorText}</CardContent>
            </Card>
        </Dialog>
    } else if (ampSDK?.view === 'single') {
        component = <AutoCompleteSingle ampSDK={ampSDK} />
    } else if (ampSDK?.view === 'multi') {
        component = <AutoCompleteMultiple ampSDK={ampSDK} />
    } else if (ampSDK?.view === 'tree') {
        component = <TreeViewSingle ampSDK={ampSDK} />
    } else if (ampSDK?.view === 'product') {
        component = <ProductSelector ampSDK={ampSDK} />
    } else {
        component = (
            <>
                <CircularProgress />
                <div>Loading View..</div>
            </>
        )
    }

    return (
        <div className='App'>
            <Stack spacing={0} sx={{ width: '100%' }}>
                {
                    ampSDK?.getTitle() &&
                    <Typography variant='body1' color={'#333333'}>{ampSDK?.getTitle()}</Typography>
                }
                {
                    ampSDK?.getDescription() &&
                    <Typography variant='caption' color={'#808080'}>{ampSDK?.getDescription()}</Typography>
                }
                {
                    (ampSDK?.getDescription() || ampSDK?.getTitle()) &&
                    <Divider sx={{marginTop:1, marginBottom:1}} variant="fullWidth"></Divider>
                }
                {component}
            </Stack>
        </div>
    )
}

export default App
