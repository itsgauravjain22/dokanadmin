import React, { Component } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Clipboard, Image, ScrollView, ActivityIndicator, Modal, ToastAndroid } from 'react-native';
import Moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import RadioButtons from '../commoncomponents/radiobuttons'
import GLOBAL from './orderglobal'

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
            orderStatusModalShown: false
        };
        GLOBAL.orderdetailsScreen = this;
        orderId = this.props.navigation.getParam('orderId');
        base_url = this.props.navigation.getParam('base_url');
        c_key = this.props.navigation.getParam('c_key');
        c_secret = this.props.navigation.getParam('c_secret');
    }

    static navigationOptions = ({ navigation }) => {
        return {
            title: `#${navigation.getParam('orderId', 'Order Details')}`,
            headerStyle: {
                backgroundColor: '#96588a',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
                fontWeight: 'bold',
            },
        };
    };

    componentDidMount() {
        this.focusListener = this.props.navigation.addListener('didFocus', () => {
            this.fetchOrderDetails()
        });
    }

    render() {
        if (this.state.loading) {
            return (
                <View style={{ flex: 1, justifyContent: "center", alignContent: "center", padding: 20 }}>
                    <ActivityIndicator color='#96588a' size='large' />
                </View>
            )
        }

        return (
            <ScrollView style={{ flex: 1 }}>
                {this.displayOrderDataSection()}
                {this.displayProductSection()}
                {this.displayPaymentSection()}
                {this.displayShippingDetailsSection()}
                {this.displayBillingDetailsSection()}
            </ScrollView>
        );
    }

    fetchOrderDetails = () => {
        const url = `${base_url}/wp-json/wc/v3/orders/${orderId}?consumer_key=${c_key}&consumer_secret=${c_secret}`;
        this.setState({ loading: true });
        fetch(url).then((response) => response.json())
            .then((responseJson) => {
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
        const orderStatusesurl = `${base_url}/wp-json/wc/v3/reports/orders/totals?consumer_key=${c_key}&consumer_secret=${c_secret}`;
        fetch(orderStatusesurl).then(response => response.json())
            .then(responseJson => {
                let orderStatusMap = new Map();
                if (Array.isArray(responseJson) && responseJson.length > 0) {
                    if ('slug' in responseJson[0] && 'name' in responseJson[0]) {
                        responseJson.forEach(item => {
                            orderStatusMap.set(item.slug, item.name)
                        })
                    }
                }
                this.setState({
                    orderStatusOptions: [...orderStatusMap],
                    orderStatusValue: this.state.orderData.status,
                    loading: false,
                }, this.fetchOrderProductImages())
            })
    }

    fetchOrderProductImages = () => {
        this.state.orderData.line_items.forEach((item, index) => {
            this.fetchProductPrimaryImage(item.product_id, index)
        })
    }

    fetchProductPrimaryImage = (productId, index) => {
        this.setState({ imageLoading: true });
        let url = `${base_url}/wp-json/wc/v3/products/${productId}?consumer_key=${c_key}&consumer_secret=${c_secret}`
        fetch(url)
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
                    <View style={{ flex: 1, justifyContent: "center", alignContent: "center" }}>
                        <Image source={'primary_image_src' in item?{uri: item.primary_image_src}:null}
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
        return (this.state.orderData.currency_symbol) ? this.state.orderData.currency_symbol : this.state.orderData.currency;
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
        const url = `${base_url}/wp-json/wc/v3/orders/${orderId}?consumer_key=${c_key}&consumer_secret=${c_secret}`;
        fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "status": this.state.orderStatusValue
            })
        }).then((response) => response.json())
            .then(responseJson => {
                if ('code' in responseJson)
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
                GLOBAL.orderlistScreen.handleRefresh()
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
                            value={this.state.orderData.status}
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
                        <Text>Order Status: {this.state.orderData.status}</Text>
                    </View>
                    <View style={{ width: '10%', justifyContent: 'center', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => this.setState({
                                orderStatusModalShown: !this.state.orderStatusModalShown
                            })}
                        >
                            <Ionicons name="md-create" size={25} color="#96588a" />
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
                <Text style={{ fontWeight: 'bold' }}>Order Total: {this.getCurrencySymbol()}{this.state.orderData.total}</Text>
                <Text>Product Total: {this.getCurrencySymbol()}{this.getProductTotal()}</Text>
                <Text>Shipping:{this.getCurrencySymbol()}{this.state.orderData.shipping_total}</Text>
                <Text>Taxes: {this.getCurrencySymbol()}{this.state.orderData.total_tax}</Text>
                <Text>Payment Gateway: {this.state.orderData.payment_method_title}</Text>
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
        color: '#96588a',
        fontWeight: 'bold',
        marginRight: 15,
        marginBottom: 15
    }
});