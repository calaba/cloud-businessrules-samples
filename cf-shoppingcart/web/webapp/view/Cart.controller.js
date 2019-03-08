sap.ui.define([
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	'sap/ui/Device',
	'sap/demo/bpmrulesshoppingcart/model/formatter',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/m/Dialog',
	'sap/m/Button'
], function(
	Controller,
	JSONModel,
	Device,
	formatter,
	MessageBox,
	MessageToast,
	Dialog,
	Button) {
	var sCartModelName = "cartProducts";
	var sRulesInputModelName = "ruleInputPayload";
	var oController;
	var oThisView;
	var _orderDialog;
	var _orderBusyDialog;

	return Controller.extend("sap.demo.bpmrulesshoppingcart.view.Cart", {
		formatter: formatter,

		onInit: function() {
			oController = this;
			this._router = sap.ui.core.UIComponent.getRouterFor(this);
			this._router.getRoute("cart").attachPatternMatched(this._routePatternMatched, this);

			// set initial ui configuration model
			var oCfgModel = new JSONModel({});
			this.getView().setModel(oCfgModel, "cfg");
			this._toggleCfgModel();
		},

		onExit: function() {
			if (this._orderDialog) {
				this._orderDialog.destroy();
			}
			if (this._orderBusyDialog) {
				this._orderBusyDialog.destroy();
			}
		},

		_routePatternMatched: function() {
			//set selection of list back
			var oEntryList = this.getView().byId("entryList");
			oEntryList.removeSelections();
		},

		handleEditOrDoneButtonPress: function() {
			this._toggleCfgModel();
		},

		_toggleCfgModel: function() {
			var oCfgModel = this.getView().getModel("cfg");
			var oData = oCfgModel.getData();
			var bDataNoSetYet = !oData.hasOwnProperty("inDelete");
			var bInDelete = (bDataNoSetYet) ? true : oData.inDelete;
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			oCfgModel.setData({
				inDelete: !bInDelete,
				notInDelete: bInDelete,
				listMode: bInDelete ? Device.system.phone ? "None" : "SingleSelectMaster" : "Delete",
				listItemType: bInDelete ? Device.system.phone ? "Active" : "Inactive" : "Inactive",
				pageTitle: (bInDelete) ? oBundle.getText("CART_TITLE_DISPLAY") : oBundle.getText("CART_TITLE_EDIT")
			});
		},

		handleNavButtonPress: function() {
			this.getOwnerComponent().myNavBack();
		},

		handleEntryListPress: function(oEvent) {
			this._showProduct(oEvent.getSource());
		},

		handleEntryListSelect: function(oEvent) {
			this._showProduct(oEvent.getParameter("listItem"));
		},

		onSaveForLater: function(oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			var oModelData = oBindingContext.getModel().getData();

			var oListToAddItem = oModelData.savedForLaterEntries;
			var oListToDeleteItem = oModelData.cartEntries;
			this._changeList(oListToAddItem, oListToDeleteItem, oEvent);
		},

		onAddBackToCart: function(oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			var oModelData = oBindingContext.getModel().getData();

			var oListToAddItem = oModelData.cartEntries;
			var oListToDeleteItem = oModelData.savedForLaterEntries;
			this._changeList(oListToAddItem, oListToDeleteItem, oEvent);
		},

		_changeList: function(oListToAddItem, oListToDeleteItem, oEvent) {
			var oBindingContext = oEvent.getSource().getBindingContext(sCartModelName);
			var oCartModel = this.getView().getModel(sCartModelName);
			var oProduct = oBindingContext.getObject();
			var sProductId = oProduct.ProductId;

			// find existing entry for product
			if (oListToAddItem[sProductId] === undefined) {
				// copy new entry
				oListToAddItem[sProductId] = oProduct;
			}

			//Delete the saved Product from cart
			delete oListToDeleteItem[sProductId];
			// update model
			oCartModel.refresh(true);
		},

		_showProduct: function(item) {
			// send event to refresh
			var sPath = item.getBindingContext(sCartModelName).getPath();
			var oEntry = this.getView().getModel(sCartModelName).getProperty(sPath);
			var sId = oEntry.ProductId;
			if (!sap.ui.Device.system.phone) {
				this._router.getTargets().display("productView");
				var bus = sap.ui.getCore().getEventBus();
				bus.publish("shoppingCart", "updateProduct", {
					productId: sId
				});
			} else {
				this._router.navTo("cartProduct", {
					productId: sId
				});
			}
		},

		handleEntryListDelete: function(oEvent) {
			// show confirmation dialog
			var sEntry = oEvent.getParameter("listItem").getBindingContext(sCartModelName).getObject();
			var sEntryId = sEntry.ProductId;
			var sEntryCategory = sEntry.Category;
			var sEntrySeller = sEntry.SupplierName;
			var sEntryQuantity = sEntry.Quantity;
			
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			MessageBox.show(
				oBundle.getText("CART_DELETE_DIALOG_MSG"), {
					title: oBundle.getText("CART_DELETE_DIALOG_TITLE"),
					actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
					onClose: jQuery.proxy(function(oAction) {
						if (MessageBox.Action.DELETE === oAction) {
							var oModel = this.getView().getModel(sCartModelName);
							var oData = oModel.getData();

							var cartEntriesObj = oData.cartEntries;
							var array = $.map(cartEntriesObj, function(value, index) {
								return [value];
							});

							var aNewEntries = jQuery.grep(array, function(oEntry) {
								var keep = (oEntry.ProductId !== sEntryId);
								if (!keep) {
									oData.totalPrice = parseFloat(oData.totalPrice).toFixed(2) - parseFloat(oEntry.Price).toFixed(2) * oEntry.Quantity;
								}
								return keep;
							});

							oData.cartEntries = $.extend({}, aNewEntries);
							oData.showEditAndProceedButton = aNewEntries.length > 0;
							oModel.setData(oData);
							
							// Refresh Rules Model List to update the Quantity
							var oRulesModel = this.getView().getModel(sRulesInputModelName);
							var oRulesData = oRulesModel.getData();
							var ruleEntriesObj = oRulesData.ruleModelEntries;
							var deletedEntry = ruleEntriesObj[sEntryCategory];
							var index = sEntryCategory;
							if(deletedEntry === undefined){// It is workshop application
								index = sEntryCategory + "-" + sEntrySeller;
								deletedEntry = ruleEntriesObj[index];
							}
							
							var sQuantity = deletedEntry[0].Quantity;
							var newQuantity = sQuantity - sEntryQuantity;
							ruleEntriesObj[index][0].Quantity = newQuantity;

							oRulesData.oRulesModelEntries = ruleEntriesObj;
							oRulesModel.setData(oRulesData);
						}
					}, this)
				});
		},

		handleProceedButtonPress: function(oEvent) {
			var that = this;
			//if (!this._orderDialog) {

			// create busy dialog
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			_orderBusyDialog = new sap.m.BusyDialog({});
			_orderBusyDialog.open();

			oThisView = this.getView();
			var orderValueModel = new sap.ui.model.json.JSONModel();
			var oInputView;
			// Invoke Rules to get Discount and Shipping Cost
			$.ajax({
				url: "/bpmrulesruntime/rules-service/rest/v1/xsrf-token",
				method: "GET",
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function(result, xhr, data) {
					var token = data.getResponseHeader("X-CSRF-Token");
					var oRuleModel = oController.getView().getModel("ruleInputPayload");
						var ruleObj = oRuleModel.getData().ruleModelEntries;

					var array = $.map(ruleObj, function(value, index) {
						return [value];
					});
					
					var rulepkgName = jQuery.sap.getUriParameters().get("rulepkg");
					if (rulepkgName === undefined || rulepkgName === "" || rulepkgName === null) {
						rulepkgName = "ShoppingCartPromotionRules";
					}
					
					var shipmentDiscountDetails = [];

					for (var arrIndex = 0; arrIndex <= array.length - 1; arrIndex++) {
						var oDiscountRulesInputModel = array[arrIndex];
						var payloadStr2 = JSON.stringify(oDiscountRulesInputModel);

						var shipmentDiscount = {};
						var oCategory = oDiscountRulesInputModel[0].Category;

						// Get the Discount 
						$.ajax({
							url: " /bpmrulesruntime/rules-service/rest/v1/rule-services/java/" + rulepkgName + "/DiscountRuleservice",
							method: "POST",
							contentType: "application/json",
							data: payloadStr2,
							async: false,
							headers: {
								"X-CSRF-Token": token
							},
							success: function(result1, xhr1, data1) {
								if (result1 != null) {
									shipmentDiscount.Discount = result1[0].Discount;
									shipmentDiscountDetails[oCategory] = shipmentDiscount;
								}
							}
						});
					}

					var oCartModels = oController.getView().getModel("cartProducts");
					var oCartEntries = oCartModels.getData().cartEntries;

					var cartArray = $.map(oCartEntries, function(value, index) {
						return [value];
					});

					var shipmentDetails = [];

					for (var cartIndex = 0; cartIndex <= cartArray.length - 1; cartIndex++) {
						var oCartEntryModel = cartArray[cartIndex];
						oCartEntryModel.__type__ = "Product";

						var oSellerModel = {};
						oSellerModel.__type__ = "Seller";
						oSellerModel.Name = oCartEntryModel.Soldby;

						var oShipmentRulesInputModel = [];
						oShipmentRulesInputModel.push(oCartEntryModel);
						oShipmentRulesInputModel.push(oSellerModel);

						var payloadStr1 = JSON.stringify(oShipmentRulesInputModel);

						// Get the shipping rates
						$.ajax({
							url: " /bpmrulesruntime/rules-service/rest/v1/rule-services/java/ShoppingCartPromotionRules/ShippingRuleservice",
							method: "POST",
							contentType: "application/json",
							data: payloadStr1,
							async: false,
							headers: {
								"X-CSRF-Token": token
							},
							success: function(result1, xhr1, data1) {
								if (result1.length > 0) {
									oCartEntryModel.ShipmentCost = result1[0].ShippingCost;
									oCartEntryModel.ShipmentTime = result1[0].ShippingTime;

									oCartEntryModel.Discount = shipmentDiscountDetails[oCartEntryModel.Category].Discount;

									var totalPrice = oCartEntryModel.UnitPrice * oCartEntryModel.Quantity;
									oCartEntryModel.TotalPrice = totalPrice.toFixed(2);

									var priceAfterDiscount = totalPrice - (totalPrice * (oCartEntryModel.Discount / 100));
									var grossPrice = priceAfterDiscount + oCartEntryModel.ShipmentCost;
									oCartEntryModel.GrossPrice = grossPrice;

									shipmentDetails.push(oCartEntryModel);
									orderValueModel.setData({
										modeldata: shipmentDetails
									});
								}
							}
						});
						
						_orderBusyDialog.close();
					}

					// create order dialog
					oInputView = sap.ui.view({
						//id: "Order",
						viewName: "sap.demo.bpmrulesshoppingcart.view.Order",
						type: "XML",
						viewData: orderValueModel
					});

					_orderDialog = new Dialog({
						title: oBundle.getText("CART_ORDER_DIALOG_TITLE"),
						stretch: Device.system.phone,
						content: [
							oInputView
						],
						leftButton: new Button({
							text: oBundle.getText("CART_ORDER_DIALOG_CONFIRM_ACTION"),
							type: "Accept",
							press: function() {
								var bInputValid = oInputView.getController()._checkInput();
								if (bInputValid) {
									_orderDialog.close();
									var msg = "Your order was placed.";
									that._resetCart();
									MessageToast.show(msg, {});
								}
							}
						}),
						rightButton: new Button({
							text: oBundle.getText("DIALOG_CANCEL_ACTION"),
							press: function() {
								_orderDialog.close();
							}
						})
					});

					oThisView.addDependent(_orderDialog);

					// open order dialog
					_orderDialog.open();
				}
			});
			//	}

		},

		_resetCart: function() {
			//delete cart content
			var oCartProductsModel = this.getView().getModel(sCartModelName);
			var oCartProductsModelData = oCartProductsModel.getData();
			oCartProductsModelData.cartEntries = {};
			oCartProductsModelData.totalPrice = "0";
			oCartProductsModelData.showEditAndProceedButton = false;
			oCartProductsModel.setData(oCartProductsModelData);
			this._router.navTo("home");
			if (!Device.system.phone) {
				this._router.getTargets().display("welcome");
			}
		}
	});
});