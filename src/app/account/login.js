import React, { Component } from 'react';
import {
    StyleSheet, TextInput, TouchableOpacity, Text, ToastAndroid, ActivityIndicator,
    Image, View, KeyboardAvoidingView, ScrollView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Base64 from '../../utility/base64';
const config = require('../../../config.json');

export default class Login extends Component {

    static navigationOptions = ({ navigation }) => {
        return {
            headerShown: false
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            showPass: true,
            press: false,
            loading: false,
            base_url: null,
            username: null,
            password: null,
        };
        this.showPass = this.showPass.bind(this);
        this.submitButton = this.submitButton.bind(this);
    }

    showPass() {
        this.state.press === false
            ? this.setState({ showPass: false, press: true })
            : this.setState({ showPass: true, press: false });
    }

    checkAuthentication = async () => {
        let url = `${this.state.base_url}/wp-json/dokan/v1/reports/summary`;

        try {
            let response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Basic ${Base64.btoa(this.state.username+':'+this.state.password)}`
                }
            });
            if (response.ok) {
                let credentials = {
                    'base_url': this.state.base_url,
                    'username': this.state.username,
                    'password': this.state.password,
                }
                await SecureStore.setItemAsync('credentials', JSON.stringify(credentials));
                ToastAndroid.show('Authenticated...', ToastAndroid.LONG);
                return true;
            } else if (response.status >= 400 && response.status <= 500) {
                let responseStatus = response.status;
                let responseData = await response.json();
                ToastAndroid.show(`Error: ${responseStatus} - ${responseData.message}`, ToastAndroid.LONG);
                return false;
            }
        } catch (error) {
            ToastAndroid.show('Error Resolving Url - ' + error, ToastAndroid.LONG);
            return false;
        }
    }

    submitButton = async () => {
        if (this.state.loading) return;

        this.setState({
            loading: true,
        });

        let authenticated = await this.checkAuthentication();
        if (authenticated) {
            this.setState({
                loading: false
            }, () => this.props.navigation.navigate('App')
            );
        } else {
            this.setState({ loading: false });
        }
    }

    render() {
        return (
            <KeyboardAvoidingView behavior="padding" style={styles.container} enabled>
                <ScrollView>
                    <View style={styles.innerContainer}>
                        <View style={styles.inputWrapper}>
                            <View style={{
                                justifyContent: 'center',
                                alignItems: 'center',
                                margin: 15
                            }}>
                                <Image
                                    source={require('../../../assets/images/logo.png')}
                                    style={{
                                        height: 150,
                                        width: 150,
                                    }}
                                />
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="Woocommerce site url (with https)"
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                returnKeyType={'next'}
                                placeholderTextColor={config.colors.textInputColor}
                                underlineColorAndroid="transparent"
                                onChangeText={(base_url) => this.setState({ 'base_url': base_url })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Username"
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                returnKeyType={'next'}
                                placeholderTextColor={config.colors.textInputColor}
                                underlineColorAndroid="transparent"
                                onChangeText={(username) => this.setState({ 'username': username })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                secureTextEntry={this.state.showPass}
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                returnKeyType={'done'}
                                placeholderTextColor={config.colors.textInputColor}
                                underlineColorAndroid="transparent"
                                onChangeText={(password) => this.setState({ 'password': password })}
                            />
                            <View style={styles.showPassword}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={{ paddingRight: 10, paddingTop: 10, paddingBottom: 15 }}
                                    onPress={this.showPass}>
                                    <Text style={{ color: config.colors.btnColor }}>Show Secret</Text>
                                </TouchableOpacity>
                            </View>
                            <View>
                                {this.state.loading
                                    ? <ActivityIndicator size="large" color={config.colors.loadingColor} />
                                    : <TouchableOpacity style={styles.loginBtn} onPress={this.submitButton}>
                                        <Text style={styles.loginBtnText}>
                                            Login
                                        </Text>
                                    </TouchableOpacity>
                                }
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView >
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: 'white'
    },
    innerContainer: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        marginTop: 80,
        marginBottom: 50,
        width: '80%'
    },
    input: {
        backgroundColor: 'white',
        width: '100%',
        height: 50,
        marginTop: 10,
        color: config.colors.textInputColor,
        borderBottomColor: config.colors.textInputColor,
        borderBottomWidth: 1,
    },
    showPassword: {
        width: '100%',
        marginTop: 5,
        alignItems: 'flex-end'
    },
    loginBtn: {
        backgroundColor: config.colors.btnColor,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        height: 50,
    },
    loginBtnText: {
        color: config.colors.btnTextColor,
        fontWeight: 'bold',
        fontSize: 16
    }
});
