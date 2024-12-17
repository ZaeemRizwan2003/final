import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useCart } from "./cartcontext";
import { FaRegMinusSquare, FaRegPlusSquare } from "react-icons/fa";
import { RiDeleteBin2Line } from "react-icons/ri";
import DashNav from "@/Components/CustomerNavbar";
import { loadStripe } from "@stripe/stripe-js";
import { fetchAddresses, addNewAddress, setDefaultAddress } from "./Addresses";
import AddressList from "@/Components/AddressList";
import MapModal from "@/Components/MapModal";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const Checkout = () => {
  const {
    cart,
    setCart,
    incrementItemQuantity,
    decrementItemQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [newAddress, setNewAddress] = useState({
    addressLine: "",
    city: "",
    postalCode: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("");
  const [showMapModal, setShowMapModal] = useState(false);

  const router = useRouter();

  // Fetch addresses and user info on component mount
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const userId = localStorage.getItem("userId");
        const res = await axios.get(`/api/Customer/checkout?userId=${userId}`);
        const { addresses, userInfo } = res.data;

        setAddresses(addresses);

        if (addresses.length > 0) {
          const defaultAddress =
            addresses.find((address) => address.isDefault) || addresses[0];
          setSelectedAddress(defaultAddress._id);
        }

        setUserInfo({ ...userInfo, phone: "" }); // Let the user input phone and city
      } catch (err) {
        console.error(err);
      }
    };

    fetchCheckoutData();
  }, []);

  const handleNewAddress = async () => {
    const userId = localStorage.getItem("userId");
    const addedAddress = await addNewAddress(userId, newAddress);
    setAddresses([...addresses, { ...addedAddress, isDefault: false }]);
    setShowModal(false);
  };

  const handleSetDefaultAddress = async (addressId) => {
    const userId = localStorage.getItem("userId");
    await setDefaultAddress(userId, addressId);
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr._id === addressId,
      }))
    );
    setSelectedAddress(addressId);
  };

  const handleSaveLocation = async (location) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("User ID is missing from localStorage");
      return;
    }

    try {
      const response = await axios.post("/api/Customer/map-address", {
        userId,
        location,
      });
      console.log("API response:", response.data);

      if (response.data.success && response.data.newAddress) {
        setAddresses((prevAddresses) => [...prevAddresses, response.data.newAddress]);
        setShowMapModal(false);
        alert("Location saved successfully!");

      } else {
        console.error("Unexpected API response:", response.data);
        alert("Failed to save location. Please try again.");
      }

    } catch (error) {
      console.error("Failed to save location", error);
      alert("Failed to save location. Please try again.");
    }
  };

  const handleSubmit = async () => {
    const userId = localStorage.getItem("userId");
    const totalAmount = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (!selectedAddress) {
      alert("Please select an address.");
      return;
    }

    const orderData = {
      userId,
      items: cart,
      totalAmount,
      addressId: selectedAddress, // Corrected key
    };

    console.log("Order data being sent:", orderData);
    try {
      const response = await axios.post("/api/Customer/order", orderData);
      const orderId = response.data._id;

      clearCart();
      setCart([]);
      router.push(`/Customer/OrderConfirm?id=${orderId}`);
    } catch (err) {
      console.error(
        "Order submission failed",
        err.response?.data || err.message
      );
    }
  };

  const handleStripePayment = async () => {
    const stripe = await stripePromise;
    const userId = localStorage.getItem("userId");

    if (!selectedAddress) {
      alert("Please select an address");
      return;
    }

    try {
      const response = await axios.post(
        "/api/Customer/create-checkout-session",
        {
          userId,
          items: cart,
          totalAmount: totalCartPrice,
          addressId: selectedAddress,
        }
      );

      const sessionId = response.data.id;
      await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
      console.error("Stripe payment failed", error);
    }
  };

  const totalCartPrice = cart
    .reduce((total, item) => total + 150 + item.price * item.quantity, 0)
    .toFixed(2);

  return (
    <div>
      <DashNav isCheckout={true} />
      <div className="checkout-page max-w-4xl mx-auto p-4 mt-16">
        <h1 className="text-3xl font-bold text-purple-800 mb-6">Checkout</h1>

        {/* Address Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-black">Select Address</h2>
          <AddressList
            addresses={addresses}
            handleSetDefaultAddress={handleSetDefaultAddress}
          />

          <button
            className="mt-4 p-2 bg-purple-700 text-white rounded hover:bg-purple-800"
            onClick={() => setShowModal(true)}
          >
            Add New Address
          </button>

          <button
            className="bg-blue-600 mt-4 ml-2 p-2  text-white rounded hover:bg-blue-700"
            onClick={() => setShowMapModal(true)}
          >
            Use Maps
          </button>
        </div>

        {/* User Info Section */}
        <h2 className="text-xl font-semibold text-black mt-8">User Info</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            name="name"
            value={userInfo.name}
            onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
            className="p-3 border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
            placeholder="Name"
          />
          <input
            type="email"
            name="email"
            value={userInfo.email}
            onChange={(e) =>
              setUserInfo({ ...userInfo, email: e.target.value })
            }
            className="p-3 border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
            placeholder="Email"
          />
          <input
            type="text"
            name="phone"
            value={userInfo.phone}
            onChange={(e) =>
              setUserInfo({ ...userInfo, phone: e.target.value })
            }
            className="p-3 border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
            placeholder="Phone"
          />
          <input
            type="text"
            name="city"
            value={userInfo.city}
            onChange={(e) => setUserInfo({ ...userInfo, city: e.target.value })}
            className="p-3 border border-purple-300 rounded-lg focus:outline-none focus:border-purple-500"
            placeholder="City"
          />
        </div>

        {/* Payment Method Section */}
        <h2 className="text-xl font-semibold text-black mt-8">
          Payment Method
        </h2>
        <div className="flex gap-4 mt-2">
          <label
            className={`flex items-center justify-center border-2 rounded-lg p-4 w-full text-center cursor-pointer ${
              paymentMethod === "COD"
                ? "border-purple-700 bg-purple-100"
                : "border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="COD"
              checked={paymentMethod === "COD"}
              onChange={() => setPaymentMethod("COD")}
              className="hidden"
            />
            Cash on Delivery (COD)
          </label>

          <label
            onClick={handleStripePayment}
            className="flex items-center justify-center border-2 rounded-lg p-4 w-full text-center cursor-pointer border-gray-300 hover:border-purple-700 hover:bg-purple-100"
          >
            Pay Online
          </label>
        </div>

        {/* Cart Info Section */}
        <h2 className="text-xl font-semibold text-black mt-8">Cart Items</h2>
        <div className="cart-items mt-4">
          {cart.map((item) => (
            <div
              key={item.itemId}
              className="flex justify-between items-center border-b py-2"
            >
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-gray-500">Rs.{item.price} each</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => decrementItemQuantity(item.itemId)}>
                  <FaRegMinusSquare className="text-purple-600" />
                </button>
                <span>{item.quantity}</span>
                <button onClick={() => incrementItemQuantity(item.itemId)}>
                  <FaRegPlusSquare className="text-purple-600" />
                </button>
                <button onClick={() => removeFromCart(item.itemId)}>
                  <RiDeleteBin2Line className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
          <div className="mt-4 text-right">
            <p>+ Delivery Charges: Rs.150</p>
            <p className="text-lg font-semibold">Total: Rs.{totalCartPrice}</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            className="bg-purple-700 text-white py-3 px-8 rounded-lg hover:bg-purple-800"
          >
            Confirm Order
          </button>
        </div>
      </div>

      {showMapModal && (
        <MapModal
          onClose={() => setShowMapModal(false)} // Close modal
          onSaveLocation={handleSaveLocation} // Save location
        />
      )}

      {/* Modal for New Address */}
      {showModal && (
        <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="modal-content bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Add New Address</h2>
            <input
              type="text"
              placeholder="Address Line"
              value={newAddress.addressLine}
              onChange={(e) =>
                setNewAddress({ ...newAddress, addressLine: e.target.value })
              }
              className="w-full p-3 border border-purple-300 rounded-lg mb-4 focus:outline-none focus:border-purple-500"
            />
            <input
              type="text"
              placeholder="City"
              value={newAddress.city}
              onChange={(e) =>
                setNewAddress({ ...newAddress, city: e.target.value })
              }
              className="w-full p-3 border border-purple-300 rounded-lg mb-4 focus:outline-none focus:border-purple-500"
            />
            <input
              type="text"
              placeholder="Postal Code"
              value={newAddress.postalCode}
              onChange={(e) =>
                setNewAddress({ ...newAddress, postalCode: e.target.value })
              }
              className="w-full p-3 border border-purple-300 rounded-lg mb-4 focus:outline-none focus:border-purple-500"
            />
            <div className="text-right">
              <button
                className="bg-gray-300 text-black py-2 px-4 rounded-lg mr-4"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-purple-700 text-white py-2 px-4 rounded-lg"
                onClick={handleNewAddress}
              >
                Save Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
