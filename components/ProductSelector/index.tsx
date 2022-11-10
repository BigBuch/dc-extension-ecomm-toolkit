import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Autocomplete,
    TextField,
    Typography,
    Paper,
    Dialog,
    Card,
    CardContent,
    CardActions,
    Backdrop,
    CircularProgress,
    ToggleButton,
    IconButton,
    ImageList,
    Pagination
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ProductTile from "../ProductTile";
import SortableList from "../SortableList";
import {AmpSDKProps} from "../../lib/models/treeItemData";
import { constant } from "lodash";

const ProductSelector: React.FC<AmpSDKProps> = ({ ampSDK }) => {
    const [storedValue, setStoredValue] = useState(ampSDK.getStoredValue())
    const [mode, setMode] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showAlert, setShowAlert] = useState(false)
    const [alertMessage, setAlertMessage] = useState('')
    const [results, setResults] = useState([])
    const [selectedProducts, setSelectedProducts] = useState([])
    const keywordInput = useRef(null)
    const container = useRef(null)

    const itemsPerPage = 12;
    const [page, setPage] = React.useState(1);
    const [noOfPages, setNoOfPages] = React.useState(
        Math.ceil(results.length / itemsPerPage)
    );

    const handlePageChange = (event, value) => {
        setPage(value);
      };

    const searchByCategory = async (catId: string) => {
        setResults([])
        setLoading(true)
        const p = await ampSDK.commerceApi.getCategory({ slug: catId });
        setResults(p.products)
        setLoading(false)
    };

    const searchByKeyword = async () => {
        setResults([])
        setLoading(true)
        const p = await ampSDK.commerceApi.getProducts({
            keyword: keywordInput.current.value,
        })

        /* const variants = await ampSDK.commerceApi.getVariants({productId: '25517934M'})
        console.log('variants', variants) */
        setLoading(false)
        setResults(p)
    };

    const handleKeyWordKeydown = (event: React.KeyboardEvent<HTMLElement>) => {
        if(event.keyCode === 13){
            searchByKeyword()
            return false
        }else if(event.keyCode === 27){
            setKeyword('')
            setResults([])
        }
    }

    const handleKeywordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setKeyword(event.target.value);
    };

    const selectProduct = (product: any) => {
        if((ampSDK?.type === 'string' || ampSDK?.type === 'object') && selectedProducts.length){
            setAlertMessage("You've reached the maximum amount of selectable items")
            setShowAlert(true)
        }else{
            const match = selectedProducts.find(p => p.id === product.id)
            console.log('match: ', match)
            if(match){
                setAlertMessage("You've already selected this item")
                setShowAlert(true)
            }else{
                setSelectedProducts(selectedProducts => [...selectedProducts, {...product, deleteKey: selectedProducts.length, selectedVariant: product.variants[0]}])
            }
        }
    }

    const removeProduct = (productTile: any) => {
        setSelectedProducts(selectedProducts.filter(p => p.deleteKey !== productTile.deleteKey))
    }

    //const updateVariant()

    const updateSelected = useCallback((selectedProducts) => {
        if(selectedProducts.length){
            switch (ampSDK?.type) {
                case 'string':
                    const formStr = selectedProducts.map(prod => (prod.id))
                    //console.log('single string: ', formStr[0])
                    ampSDK.setValue(formStr[0])
                    break;
                case 'strings':
                    const formStrs = selectedProducts.map(prod => (prod.id))
                    //console.log('strings: ', formStrs)
                    ampSDK.setValue(formStrs)
                    break;
                case 'object':
                    const formVal = {id: selectedProducts[0].id, variant: selectedProducts[0].selectedVariant?.sku }
                    //console.log('object: ', formVal)
                    ampSDK.setValue(formVal)
                    break;
                case 'objects':
                    const formVals = selectedProducts.map(prod => ({id: prod.id, variant: prod.selectedVariant?.sku}))
                    //console.log('objects: ', formVals)
                    ampSDK.setValue(formVals)
                    break;
            
                default:
                    break;
            }
        }else{
            ampSDK.clearValue()
        }
    }, [ampSDK])

    useEffect(() => {
        if(!mode) keywordInput.current.value = ''
        setResults([])
    }, [mode])
    
    useEffect(() => {
        ampSDK.setHeight(container.current.offsetHeight + 40)
        setPage(1)
        setNoOfPages(Math.ceil(results.length / itemsPerPage))
        console.log('results: ', results)
    }, [results, ampSDK, selectedProducts])

    // Whenever selectedProducts list changes, save to dc form
    useEffect(() => {
        updateSelected(selectedProducts)
    }, [selectedProducts, ampSDK, updateSelected])

    // Process values stored in the dc form to put into selecteProducts
    useEffect( () => {
        //console.log('stored vals:', storedValue)

        const getProducts = async(ids) => {
            const p = await ampSDK.commerceApi.getProducts({
                productIds: ids,
            })
            return p
        }
        // form comma-delim ID string
        if(storedValue != undefined){
            let Ids: string;
            switch (ampSDK?.type) {
                case 'string':
                    Ids = ampSDK.isEnforced() ? storedValue.split('/').pop() : storedValue
                    break;
                case 'strings':
                    Ids = storedValue.join(',')
                    break;
                case 'object':
                    Ids = storedValue.id
                    break;
                case 'objects':
                    Ids = storedValue.map((prod: any) => (prod.id)).join(',')
                    break;
                default:
                    break;
            }
            setLoading(true)
            getProducts(Ids).then( res => {
                setLoading(false)
                let prod = res.map((item: any, index: number) => {
                        const selVar = item.variants.find((v: any) => v.id === storedValue.variant)
                        return {
                            ...item, 
                            deleteKey: index, 
                            selectedVariant: (selVar !== undefined) ? 
                                selVar 
                                : item.variants[0]
                        }
                    }
                )
                
                if(ampSDK?.type === 'object') console.log('loaded object:', prod)
                setSelectedProducts(prod)
            })
        }
    }, [storedValue, ampSDK])

    return (
        <div ref={container}>
            <Dialog
                open={showAlert}
                onClose={() => setShowAlert(false)}
            >
                <Card variant="outlined">
                    <CardContent>
                        {alertMessage}
                    </CardContent>
                </Card>
            </Dialog>
            <Backdrop
                sx={{ color: '#77f', backgroundColor: 'rgba(200,200,200,0.6)', zIndex: (theme) => theme.zIndex.drawer + 1 }}
                open={loading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>
        <Typography mb={2} variant="h2" fontSize={'12px'} fontWeight={'bold'} fontStyle={'italic'} textTransform={'uppercase'}>
                Product Selector ({ampSDK.type})
            </Typography>

            { /* Dual Mode Search */}
            <Paper
                elevation={0}
                component="form"
                sx={{ p: "2px 4px", display: "flex", alignItems: "center" }}
            >
                <ToggleButton
                    value="check"
                    selected={mode}
                    sx={{padding: '6px 14px'}}
                    onChange={() => {
                        setMode(!mode)
                    }}
                >
                    Mode
                </ToggleButton>
                {mode === false ? (
                <>
                    <TextField
                        inputRef={keywordInput}
                        size='small'
                        sx={{ ml: 1, flex: 1}}
                        label="Keyword Search (esc. to clear)"
                        variant="outlined"
                        inputProps={{ "aria-label": "keyword search (escape key to clear" }}
                        onKeyDown={handleKeyWordKeydown}
                        onChange={handleKeywordChange}
                        value={keyword}
                    />
                    <IconButton
                    type="button"
                    onClick={searchByKeyword}
                    sx={{ p: "10px" }}
                    aria-label="search"
                    >
                    <SearchIcon />
                    </IconButton>
                </>
                ) : (
                <></>
                )}
                {mode === true ? (
                <Autocomplete
                    disablePortal
                    id="combo-box-demo"
                    size="small"
                    options={ampSDK.getValues()}
                    getOptionLabel={(option) => option.name || ""}
                    sx={{ width: "100%", marginTop: "0", paddingLeft: '8px' }}
                    value={storedValue}
                    onChange={(event, val) => {
                    if (val !== null) {
                        searchByCategory(val.id);
                    } else {
                        /* ampSDK.clearValue();
                                        setValue({ name: "", id: "" }); */
                    }
                    }}
                    onClose={() => {
                        ampSDK.setHeight(200);
                    }}
                    onOpen={() => {
                        ampSDK.setHeight(540);
                    }}
                    renderInput={(params) => (
                        <TextField {...params} label={ampSDK.label} />
                    )}
                />
                ) : (
                <></>
                )}
            </Paper>

            { /* Sortable Selected Products */}
            {selectedProducts.length ?
                <>
                    <Typography mt={2} variant="h3" fontSize={'10px'} fontWeight={'bold'} textTransform={'uppercase'}>
                        Selected Products
                    </Typography>
                    <SortableList selectedProducts={selectedProducts} dataType={ampSDK?.type} updateSelected={updateSelected} removeProduct={removeProduct} />
                </>
                : 
                <></>
            }

            {/* Search Results */}
            {results.length ?
                <>
                    <Typography variant="h3" fontSize={'10px'} fontWeight={'bold'} textTransform={'uppercase'}>
                        Search Results
                    </Typography>
                    <ImageList sx={{ width: '100%' }} cols={4} rowHeight={140}>
                        {results.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((product: any, index: number) => {
                            return <ProductTile key={index + page * itemsPerPage + product.id} dataType={ampSDK?.type} size={140} product={product} selectProduct={selectProduct} />
                        })} 
                    </ImageList>
                    {noOfPages > 1 && <Pagination
                        count={noOfPages}
                        page={page}
                        onChange={handlePageChange}
                        defaultPage={1}
                    />}
                </>
                :   
                <></>
            }
        </div>
    );
};

export default ProductSelector;
