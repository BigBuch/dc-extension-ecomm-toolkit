import { ContentFieldExtension, init } from 'dc-extensions-sdk';
import _ from 'lodash';

import {
	flattenCategories,
	Identifiable,
} from '@amplience/dc-integration-middleware';

import { initCommerceApi } from '../pages/api';
import { ExtParameters, FieldModel } from './models/extensionParams';

export type ValueType = Identifiable | Identifiable[] | string | string[] | null

const amplienceSDK = async () => {
    const isEnforced = () => {
        return sdk.field.schema?.pattern
    }

    const cleanValue = (value: any) => {
        return isEnforced() ? value.split('/').pop() : value
    }

    const enforceValue = (value: any) => {
        let val = value

        if (typeof value !== 'string') {
            val = value.id
        }
        if (isEnforced()) {
            let pattern = sdk.field.schema?.pattern.split('/')
            pattern.pop()
            return `${pattern.join('/')}/${val}`
        } else {
            return val
        }
    }

    // data members
    let sdk: ContentFieldExtension = await init<ContentFieldExtension<FieldModel, ExtParameters>>({ debug: true })
    let value: any = await sdk.field.getValue()
    let storedVal: any = await sdk.field.getValue()
    let values: any[] = []
    let title: string = sdk.field.schema?.title
    let description: string = sdk.field.schema?.description
    // end

    let { instance, installation } = sdk.params as ExtParameters

    const formModel = await sdk.form.getValue();

    function findValueByKey(obj, targetKey) {
        let result;

        function search(obj) {
            for (const key in obj) {
                if (key === targetKey) {
                    result = obj[key];
                    return;
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    search(obj[key]);
                    if (result !== undefined) return;
                }
            }
        }

        search(obj);
        return result;
    }

    let siteID = findValueByKey(formModel, 'site_id');

    installation.codec_params.site_id = siteID;

    let previousSiteID = siteID;

    async function monitorSDKValue() {
            const formValue = await sdk.form.getValue();
            const currentSiteID = findValueByKey(formValue, 'site_id');

            if (currentSiteID !== previousSiteID) {
                window.location.href = window.location.href;
                console.log(`siteID changed: ${previousSiteID} → ${currentSiteID}`);
                previousSiteID = currentSiteID;
            }
    }

    await sdk.form.onFormValueChange(()=>{monitorSDKValue()});

    let commerceApi = await initCommerceApi(installation)

    if (instance.data === 'category') {
        if (instance.view === 'tree') {
            values = await commerceApi.getCategoryTree({})
            if(value) value = cleanValue(value)
        }
        else {
            let categoryTree: any[] = await commerceApi.getCategoryTree({})
            values = flattenCategories(categoryTree).map(cat => ({ name: `(${cat.slug}) ${cat.name}`, slug: cat.slug, id: cat.id }))

            value = instance.type === 'string' && value ?
                (instance.view === 'multi' ?
                    values.filter(opt => value.includes(opt.id)) :
                    values.find(opt => cleanValue(value) === opt.id)) :
                instance.type === 'object' && value ?
                    values.find(opt => value.id === opt.id) :
                    value
        }
    } else if (instance.data === 'product') {
        let categoryTree: any[] = await commerceApi.getCategoryTree({})
        values = flattenCategories(categoryTree).map(cat => ({ name: `(${cat.slug}) ${cat.name}`, slug: cat.slug, id: cat.id }))
        value = instance.type === 'string' && value ? values.find(opt => cleanValue(value) === opt.id) : value
    }
    else { // a.data === 'customerGroups'
        values = await commerceApi.getCustomerGroups({})
        value = instance.type === 'string' && value ?
            (instance.view === 'multi' ?
                values.filter(opt => value.includes(opt.id)) :
                values.find(opt => cleanValue(value) === opt.id)) :
            value
    }

    let ampSDK = {
        ...instance,
        getTitle: () => title,
        getDescription: () => description,
        getValue: () => value,
        getValues: () => values,
        getStoredValue: () => storedVal,

        setValue: async (newValue: ValueType) => {
            if (newValue) {
                let v: any = newValue
                if (instance.type === 'string') {
                    if (Array.isArray(newValue)) {
                        v = newValue.map(enforceValue)
                    }
                    else {
                        v = enforceValue(newValue)
                    }
                }
                await sdk.field.setValue(v)
                value = newValue
            }
        },

        clearValue: async () => {
            await sdk.field.setValue('')
            value = { name: '', id: '' }
        },

        setHeight: (height) => {
            sdk.frame.setHeight(height)
        },

        isEnforced: () => {
            return sdk.field.schema?.pattern
        },

        commerceApi: commerceApi,
        maxItems: sdk.field.schema?.maxItems
    }

    return ampSDK
}
export default amplienceSDK
