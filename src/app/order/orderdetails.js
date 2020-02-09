import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Clipboard, Image, ScrollView, ActivityIndicator, Modal, ToastAndroid, Alert } from 'react-native';
import Moment from 'moment';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import RadioButtons from '../commoncomponents/radiobuttons'
import GLOBAL from './orderglobal'
import Base64 from '../../utility/base64';

const config = require('../../../config.json');

export default class OrderDetails extends Component {
    constructor(props) {
        super(props);
        this.state = {
            orderData: null,
            loading: true,
            imageLoading: false,
            error: null,
            orderStatusOptions: null,
            orderStatusValue: null,
            orderStatusModalShown: false,
            base_url: null,
            username: null,
            password: null
        };
        GLOBAL.orderdetailsScreen = this;
        orderId = this.props.navigation.getParam('orderId');
        this._isMounted = false;
    }

    static navigationOptions = ({ navigation }) => {
        return {
            title: `#${navigation.getParam('orderId', 'Order Details')}`
        };
    };

    async componentDidMount() {
        this._isMounted = true;
        this._isMounted && await this.getCredentials();
        this.focusListener = this.props.navigation.addListener('didFocus', () => {
            this.fetchOrderDetails()
        });
    }

    getCredentials = async () => {
        const credentials = await SecureStore.getItemAsync('credentials');
        const credentialsJson = JSON.parse(credentials)
        this.setState({
            base_url: credentialsJson.base_url,
            username: credentialsJson.username,
            password: credentialsJson.password,
        })
    }

    render() {
        if (this.state.loading) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignContent: "center", padding: 20 }}>
                    <ActivityIndicator color={config.colors.loadingColor} size='large' />
                </View>
            )
        } else {
            if (!this.state.error) {
                return (
                    <ScrollView style={{ flex: 1 }}>
                        {this.displayOrderDataSection()}
                        {this.displayProductSection()}
                        {this.displayPaymentSection()}
                        {this.displayShippingDetailsSection()}
                        {this.displayBillingDetailsSection()}
                    </ScrollView>
                );
            } else {
                return (
                    <View>
                        <Text>
                            {this.state.error.toString()}
                        </Text>
                    </View>
                )
            }
        }
    }

    fetchOrderDetails = () => {
        const { base_url, username, password } = this.state;
        let url = `${base_url}/wp-json/dokan/v1/orders/${orderId}`;
        const headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
        }
        this.setState({ loading: true });
        fetch(url, {
            method: 'GET',
            headers: headers
        }).then((response) => response.json())
            .then((responseJson) => {
                console.log(responseJson)
                this.setState({
                    orderData: responseJson,
                    error: responseJson.code || null,
                }, this.fetchOrderStatus())
            }).catch((error) => {
                this.setState({
                    error,
                    loading: false
                })
            });
    }

    fetchOrderStatus = () => {
        const { base_url, username, password } = this.state;
        const orderStatusesurl = `${base_url}/wp-json/dokan/v1/orders/summary`;
        const headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
        }
        fetch(orderStatusesurl, {
            method: 'GET',
            headers: headers
        }).then(response => response.json())
            .then(responseJson => {
                let orderStatusMap = new Map();
                if (responseJson) {
                    Object.keys(responseJson).forEach(key => {
                        if (key != 'total') {
                            orderStatusMap.set(key, key)
                        }
                    })
                }
                this.setState({
                    orderStatusOptions: [...orderStatusMap],
                    orderStatusValue: this.state.orderData.status,
                    loading: false,
                }, this.fetchOrderProductImages)
            })
    }

    fetchOrderProductImages = () => {
        this.state.orderData.line_items.forEach((item, index) => {
            this.fetchProductPrimaryImage(item.product_id, index)
        })
    }

    fetchProductPrimaryImage = (productId, index) => {
        const { base_url, username, password } = this.state;
        this.setState({ imageLoading: true });
        let url = `${base_url}/wp-json/dokan/v1/products/${productId}`
        let headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
        }
        fetch(url, {
            method: 'GET',
            headers: headers
        })
            .then((response) => response.json())
            .then(responseJson => {
                if ('images' in responseJson && Array.isArray(responseJson.images) && responseJson.images.length) {
                    if ('line_items' in this.state.orderData && Array.isArray(this.state.orderData.line_items) && this.state.orderData.line_items.length) {
                        let modifiedOrderData = this.state.orderData
                        modifiedOrderData.line_items[index].primary_image_src = responseJson.images[0].src
                        this.setState({
                            orderData: modifiedOrderData,
                            imageLoading: false,
                            error: responseJson.code || null,
                        })
                    }
                } else {
                    this.setState({
                        imageLoading: false,
                        error: responseJson.code || null,
                    });
                }
            })
            .catch((error) => {
                this.setState({
                    error,
                    imageLoading: false,
                })
            });
    }

    getLineItems = () => {
        let itemArray = [];
        this.state.orderData.line_items.forEach(item => {
            itemArray.push(
                <View key={item.id} style={{ flex: 1, flexDirection: 'row', backgroundColor: 'white' }}>
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                        <Image source={'primary_image_src' in item ? { uri: item.primary_image_src } : null}
                            style={{ height: 100, width: 100 }} resizeMode='contain' />
                    </View>
                    <View style={{ flex: 2, marginTop: 10, marginBottom: 10, justifyContent: "center" }}>
                        <View style={{ marginLeft: 10 }}>
                            <Text>{item.name}</Text>
                            <Text>SKU: {item.sku}</Text>
                            <Text>Price: {this.getCurrencySymbol()}{item.price.toFixed(2)}</Text>
                            <Text>Oty: {item.quantity}</Text>
                            <View>{this.getTMProductOptions(item.meta_data)}</View>
                        </View>
                    </View>
                </View>
            )
        })
        return itemArray;
    }

    getProductTotal = () => {
        let productTotal = 0;
        this.state.orderData.line_items.forEach(item => {
            productTotal += parseFloat(item.total);
        });
        return productTotal.toFixed(2);
    }

    getCurrencySymbol = () => {
        return (this.state.orderData.currency_symbol)
            ? this.state.orderData.currency_symbol
            : `${this.state.orderData.currency} `;
    }

    //Get optionally TM Product Options Fees Total
    getTMProductOptionsFees = () => {
        let tmProductOptionsFees = [];
        if ('fee_lines' in this.state.orderData && Array.isArray(this.state.orderData.fee_lines)
            && this.state.orderData.fee_lines.length > 0) {
            this.state.orderData.fee_lines.forEach(item => {
                if ('id' in item && 'name' in item && 'total' in item)
                    tmProductOptionsFees.push(
                        <Text key={`fee_lines_${item.id}`}>{item.name}: {item.total}</Text>
                    )
            })
        }
        return (
            <View>
                {tmProductOptionsFees}
            </View>
        )
    }

    //Get optionally TM Product Options
    getTMProductOptions(meta_dataArray) {
        let tmProductOptions = [];
        let tmProductOptionsMap = new Map();
        meta_dataArray.forEach(item => {
            if (item && (item.key === '_tmcartepo_data')) {
                item.value.forEach(tmObject => {
                    let value = `${tmObject.name}_${tmObject.value}_${item.id}`;
                    tmProductOptionsMap.set(tmObject.name, value);
                })
            }
        });
        tmProductOptionsMap.forEach((value, key) => {
            tmProductOptions.push(<Text key={value}>{key}: {(value) ? value.toString().split('_')[1] : null}</Text>)
        });
        return tmProductOptions;
    }

    //Update Functions Below

    updateOrderStatus = () => {
        const { base_url, username, password } = this.state;
        const url = `${base_url}/wp-json/dokan/v1/orders/${orderId}?status=${this.state.orderStatusValue}`;
        let headers = {
            'Authorization': `Basic ${Base64.btoa(username + ':' + password)}`
        }
        fetch(url, {
            method: 'PUT',
            headers: headers
        }).then((response) => response.json())
            .then(responseJson => {
                if ('message' in responseJson)
                    ToastAndroid.show(`Order Not Updated. Error: ${responseJson.message}`, ToastAndroid.LONG);
                else if ('status' in responseJson) {
                    this.setState({
                        orderStatusValue: responseJson.status
                    })
                    ToastAndroid.show(`Order status updated to ${responseJson.status}`, ToastAndroid.LONG)
                }
                else {
                    ToastAndroid.show(`Order Not Updated`, ToastAndroid.LONG)
                }
                this.fetchOrderDetails()
                GLOBAL.orderslistScreen.handleRefresh()
            }).catch((error) => {
                ToastAndroid.show(`Order Not Updated`, ToastAndroid.LONG)
                this.fetchOrderDetails()
            });
    }

    //Display Functions Below

    displayOrderStatusModal = () => {
        return (
            <Modal
                transparent={true}
                visible={this.state.orderStatusModalShown}>
                <View style={{
                    flex: 1,
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}>
                    <View style={{
                        flex: -1,
                        width: 300,
                        flexDirection: 'column',
                        backgroundColor: 'white'
                    }}>
                        <Text style={styles.modalTitleText}>Change Order Status</Text>
                        <RadioButtons
                            options={this.state.orderStatusOptions}
                            value={`wc-${this.state.orderData.status}`}
                            selectedValue={(selectedValue) => {
                                this.setState({
                                    orderStatusValue: selectedValue
                                })
                            }}
                        />
                        <View style={{
                            flex: 0,
                            flexDirection: 'row-reverse',
                            backgroundColor: 'white'
                        }}>
                            <View>
                                <TouchableOpacity
                                    onPress={() => {
                                        this.updateOrderStatus()
                                        this.setState({
                                            orderStatusModalShown: !this.state.orderStatusModalShown
                                        })
                                    }}>
                                    <Text style={styles.modalControlText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                            <View>
                                <TouchableOpacity
                                    onPress={() => this.setState({
                                        orderStatusModalShown: !this.state.orderStatusModalShown
                                    })}>
                                    <Text style={styles.modalControlText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal >
        )
    }

    displayOrderDataSection = () => {
        return (
            <View style={styles.section}>
                <Text style={styles.titleText}>Order #{this.state.orderData.number}</Text>
                <Text>Created at {Moment(this.state.orderData.date_created).format('D/MM/YYYY h:m:s a')}</Text>
                <View style={{ flex: 1, flexDirection: 'row' }}>
                    <View style={{ width: '90%' }}>
                        <Text>Order Status: wc-{this.state.orderData.status}</Text>
                    </View>
                    <View style={{ width: '10%', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => this.setState({
                                orderStatusModalShown: !this.state.orderStatusModalShown
                            })}
                        >
                            <Ionicons name="md-create" size={25} color={config.colors.btnColor} />
                        </TouchableOpacity>
                    </View>
                    {this.displayOrderStatusModal()}
                </View>
            </View>
        )
    }

    displayProductSection = () => {
        return (
            <View style={styles.section}>
                <Text style={styles.titleText}>Product</Text>
                {this.getLineItems()}
            </View>
        )
    }

    displayPaymentSection = () => {
        return (
            <View style={styles.section}>
                <Text style={styles.titleText}>Payment</Text>
                <Text>Payment Gateway: {this.state.orderData.payment_method_title}</Text>
                <Text style={{ fontWeight: 'bold' }}>Order Total: {this.getCurrencySymbol()}{this.state.orderData.total}</Text>
                <Text>Product Total: {this.getCurrencySymbol()}{this.getProductTotal()}</Text>
                <Text>Shipping:{this.getCurrencySymbol()}{this.state.orderData.shipping_total}</Text>
                <Text>Taxes: {this.getCurrencySymbol()}{this.state.orderData.total_tax}</Text>
                {this.getTMProductOptionsFees()}
            </View>
        )
    }

    displayShippingDetailsSection = () => {
        return (
            <View style={styles.section}>
                <Text style={styles.titleText}>Shipping Details</Text>
                <TouchableOpacity
                    onPress={() => Clipboard.setString(
                        `${this.state.orderData.shipping.first_name} ${this.state.orderData.shipping.last_name}, ${this.state.orderData.shipping.address_1} ${this.state.orderData.shipping.address_2} ${this.state.orderData.shipping.city} ${this.state.orderData.shipping.postcode} ${this.state.orderData.shipping.state} ${this.state.orderData.shipping.country}`
                    )}>
                    <Text style={{ fontWeight: 'bold' }}>{this.state.orderData.shipping.first_name}
                        {this.state.orderData.shipping.last_name}</Text>
                    <Text>{this.state.orderData.shipping.address_1} {this.state.orderData.shipping.address_2}
                        {this.state.orderData.shipping.city} {this.state.orderData.shipping.postcode}
                        {this.state.orderData.shipping.state} {this.state.orderData.shipping.country}</Text>
                </TouchableOpacity>
            </View>
        )
    }

    displayBillingDetailsSection = () => {
        return (
            <View style={styles.section}>
                <Text style={styles.titleText}>Billing Details</Text>
                <Text style={{ fontWeight: 'bold' }}>{this.state.orderData.billing.first_name}
                    {this.state.orderData.billing.last_name}</Text>
                <Text selectable dataDetectorType='phoneNumber'>Phone: {this.state.orderData.billing.phone}</Text>
                <Text selectable dataDetectorType='email'>Email: {this.state.orderData.billing.email}</Text>
                <TouchableOpacity
                    onPress={() => Clipboard.setString(
                        `${this.state.orderData.billing.first_name} ${this.state.orderData.billing.last_name}, ${this.state.orderData.billing.address_1} ${this.state.orderData.billing.address_2} ${this.state.orderData.billing.city} ${this.state.orderData.billing.postcode} ${this.state.orderData.billing.state} ${this.state.orderData.billing.country}`
                    )}>
                    <Text>Address: {this.state.orderData.billing.address_1} {this.state.orderData.billing.address_2}
                        {this.state.orderData.billing.city} {this.state.orderData.billing.postcode}
                        {this.state.orderData.billing.state} {this.state.orderData.billing.country}</Text>
                </TouchableOpacity>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    section: {
        marginTop: 15,
        marginLeft: 15,
        marginRight: 15
    },
    titleText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10
    },
    text: {
        fontSize: 16
    },
    modalTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 15,
        marginTop: 10,
        marginBottom: 10
    },
    modalControlText: {
        color: config.colors.btnColor,
        fontWeight: 'bold',
        marginRight: 15,
        marginBottom: 15
    }
});