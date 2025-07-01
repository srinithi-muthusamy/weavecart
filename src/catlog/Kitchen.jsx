import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../components/Cartcontext";
import {
  Card,
  Col,
  Row,
  Spinner,
  Alert,
  Form,
  Button,
  Container,
  InputGroup,
  Badge,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { 
  Heart, HeartFill, CartPlus, CheckCircle, ArrowRight, Truck,
  BagCheck, GeoAlt, CurrencyDollar, ShieldLock 
} from "react-bootstrap-icons";
import "bootstrap/dist/css/bootstrap.min.css";

const CheckoutProgressBar = ({ currentStep }) => {
  const steps = [
    { title: 'Review', icon: <BagCheck /> },
    { title: 'Address', icon: <GeoAlt /> },
    { title: 'Payment', icon: <CurrencyDollar /> },
    { title: 'Place Order', icon: <ShieldLock /> }
  ];

  return (
    <div className="checkout-progress mb-4">
      <div className="d-flex justify-content-between position-relative">
        {steps.map((step, index) => (
          <div 
            key={index} 
            className={`step-item ${currentStep >= index + 1 ? 'active' : ''}`}
          >
            <div className="step-icon">
              {currentStep > index + 1 ? <CheckCircle /> : step.icon}
            </div>
            <div className="step-title">{step.title}</div>
          </div>
        ))}
        <div className="progress-line" style={{ width: `${(currentStep - 1) * 33.33}%` }} />
      </div>
    </div>
  );
};

const Kitchen = () => {
  const [kitchenProducts, setKitchenProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [step, setStep] = useState(1);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);
  const [priceRange, setPriceRange] = useState([0, 10000]); // New state for price filter
  const [sortOption, setSortOption] = useState(""); // New state for sorting

  const { cartItems, addToCart } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchKitchenProducts = async () => {
      try {
        const response = await axios.get("http://localhost:5001/api/products", {
          params: { category: "kitchen" },
        });
        const products = response.data.map((product) => ({
          ...product,
          image: product.image || "https://via.placeholder.com/200?text=No+Image",
        }));
        setKitchenProducts(products);
        setFilteredProducts(products);
      } catch (err) {
        setError("Failed to fetch kitchen products");
      } finally {
        setLoading(false);
      }
    };

    fetchKitchenProducts();
  }, []);

  useEffect(() => {
    let filtered = kitchenProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      return matchesSearch && matchesPrice;
    });

    if (sortOption === "priceLowToHigh") {
      filtered = filtered.sort((a, b) => a.price - b.price);
    } else if (sortOption === "priceHighToLow") {
      filtered = filtered.sort((a, b) => b.price - a.price);
    } else if (sortOption === "nameAsc") {
      filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "nameDesc") {
      filtered = filtered.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFilteredProducts(filtered);
  }, [searchQuery, priceRange, sortOption, kitchenProducts]);

  const handleSearch = (e) => setSearchQuery(e.target.value);

  const handlePriceChange = (e) => {
    const [min, max] = e.target.value.split("-").map(Number);
    setPriceRange([min, max]);
  };

  const handleSortChange = (e) => setSortOption(e.target.value);

  const handleWishlistToggle = (productId) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleAddToCart = async (product) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to add items to the cart.');
        return;
      }

      let imageData = product.image;
      // If it's a Buffer or raw base64, add prefix
      if (imageData && typeof imageData === "string" && !imageData.startsWith("data:image") && !imageData.startsWith("http")) {
        imageData = `data:image/jpeg;base64,${imageData}`;
      }

      const cartItem = {
        _id: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: imageData
      };

      // Try to update localStorage with proper error handling
      try {
        const userCart = JSON.parse(localStorage.getItem(`cart_${token}`)) || [];
        const existingItemIndex = userCart.findIndex((item) => item._id === cartItem._id);

        if (existingItemIndex !== -1) {
          userCart[existingItemIndex].quantity += 1;
        } else {
          userCart.push(cartItem);
        }

        // Try to store the updated cart
        try {
          localStorage.setItem(`cart_${token}`, JSON.stringify(userCart));
        } catch (storageError) {
          console.warn('localStorage quota exceeded. Using fallback storage.', storageError);
          // Fallback: Remove the image data to save space
          const compactCart = userCart.map(item => ({
            ...item,
            image: item.image?.startsWith('http') ? item.image : null
          }));
          localStorage.setItem(`cart_${token}`, JSON.stringify(compactCart));
        }
      } catch (parseError) {
        console.error('Error parsing cart data:', parseError);
        // If parsing fails, create a new cart
        localStorage.setItem(`cart_${token}`, JSON.stringify([cartItem]));
      }

      addToCart(cartItem, navigate);
      alert('Item added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  const handleBuyNow = (product) => {
    const isAuthenticated = localStorage.getItem("token");
    if (!isAuthenticated) {
      alert("Please login to proceed!");
      return;
    }
    let imageData = product.image;
    if (imageData && !imageData.startsWith("data:image") && !imageData.startsWith("http")) {
      imageData = `data:image/jpeg;base64,${imageData}`;
    }
    
    setSelectedProduct({
      ...product,
      image: imageData
    });
    setShowCheckout(true);
    setStep(1);
    setOrderPlaced(false);
  };

  const handleViewDetails = (product) => {
    setDetailsProduct(product);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsProduct(null);
  };

  const nextStep = () => {
    if (step === 2 && address.trim() === "") {
      alert("Please enter delivery address.");
      return;
    }
    if (step === 3 && (name.trim() === "" || phone.trim() === "")) {
      alert("Please enter your name and phone number.");
      return;
    }
    if (step === 4 && paymentMethod.trim() === "") {
      alert("Please select a payment method.");
      return;
    }
    setStep(step + 1);
  };

  const previousStep = () => setStep(step - 1);

  const confirmOrder = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !name || !phone || !address) {
        alert("Please fill in all delivery details");
        return;
      }

      const orderData = {
        items: [
          {
            productId: selectedProduct._id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            quantity: 1,
            image: selectedProduct.image,
          },
        ],
        totalAmount: selectedProduct.price,
        name: name,
        phone: phone,
        address: address,
      };

      const response = await axios.post(
        "http://localhost:5001/api/orders",
        orderData,
        {
          headers: { Authorization: token },
        }
      );

      if (response.data?.order) {
        setOrderPlaced(true);
        setTimeout(() => {
          setShowCheckout(false);
          navigate("/profile");
        }, 2000);
      }
    } catch (error) {
      console.error("Error placing order:", error);
      alert(
        error.response?.data?.error ||
          "Failed to place order. Please try again."
      );
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-4">Review Your Order</h5>
              <ListGroup variant="flush">
                <ListGroup.Item className="py-3">
                  <div className="d-flex align-items-center">
                    <img 
                      src={selectedProduct?.image} 
                      alt={selectedProduct?.name} 
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      className="rounded"
                    />
                    <div className="ms-3 flex-grow-1">
                      <h6 className="mb-1">{selectedProduct?.name}</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <small className="text-muted">Qty: 1</small>
                          <Badge bg="success" className="ms-2">₹{selectedProduct?.price}</Badge>
                        </div>
                        <div>
                          <Badge bg="warning" text="dark">₹{selectedProduct?.price}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </ListGroup.Item>
                <ListGroup.Item className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Total Amount:</h6>
                    <h5 className="mb-0 text-success">₹{selectedProduct?.price}</h5>
                  </div>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        );

      case 2:
        return (
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-4">Delivery Address</h5>
              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone Number</Form.Label>
                      <Form.Control
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Address Line 1</Form.Label>
                  <Form.Control
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Flat No., Street Name"
                  />
                </Form.Group>
                <Row>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>City</Form.Label>
                      <Form.Control type="text" placeholder="City" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>State</Form.Label>
                      <Form.Control type="text" placeholder="State" />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>PIN Code</Form.Label>
                      <Form.Control type="text" placeholder="PIN Code" />
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        );

      case 3:
        return (
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-4">Select Payment Method</h5>
              <ListGroup variant="flush">
                {['UPI', 'Credit/Debit Card', 'Net Banking', 'Cash on Delivery'].map((method) => (
                  <ListGroup.Item key={method} className="py-3">
                    <Form.Check
                      type="radio"
                      id={method}
                      name="paymentMethod"
                      label={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="d-flex align-items-center gap-3"
                    />
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card.Body>
          </Card>
        );

      case 4:
        return (
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-4">Order Summary</h5>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <span>Items Total</span>
                  <span>₹{selectedProduct?.price}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center">
                  <span>Delivery Charges</span>
                  <Badge bg="success">FREE</Badge>
                </ListGroup.Item>
                <ListGroup.Item className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">Total Amount</h6>
                    <h5 className="mb-0 text-success">₹{selectedProduct?.price}</h5>
                  </div>
                </ListGroup.Item>
              </ListGroup>

              <div className="mt-4">
                <h6>Delivery Address:</h6>
                <p className="mb-0">{name}</p>
                <p className="mb-0">{address}</p>
                <p className="mb-0">Phone: {phone}</p>
              </div>

              <div className="mt-4">
                <h6>Payment Method:</h6>
                <p className="mb-0">{paymentMethod}</p>
              </div>
            </Card.Body>
          </Card>
        );

      default:
        return null;
    }
  };

  if (loading)
    return (
      <Spinner
        animation="border"
        variant="primary"
        className="d-block mx-auto my-5"
      />
    );
  if (error)
    return <Alert variant="danger" className="text-center">{error}</Alert>;

  return (
    <Container className="mt-5 pt-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary">Kitchen Products</h2>
        <Button variant="dark" onClick={() => navigate("/cart")}>
          Cart{" "}
          <Badge bg="danger">
            {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
          </Badge>
        </Button>
      </div>

      <Row className="mb-4">
        <Col md={4}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Search kitchen items..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Select onChange={handlePriceChange}>
            <option value="0-10000">Filter by Price</option>
            <option value="0-500">₹0 - ₹500</option>
            <option value="500-1000">₹500 - ₹1000</option>
            <option value="1000-5000">₹1000 - ₹5000</option>
            <option value="5000-10000">₹5000 - ₹10000</option>
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Select onChange={handleSortChange}>
            <option value="">Sort By</option>
            <option value="priceLowToHigh">Price: Low to High</option>
            <option value="priceHighToLow">Price: High to Low</option>
            <option value="nameAsc">Name: A to Z</option>
            <option value="nameDesc">Name: Z to A</option>
          </Form.Select>
        </Col>
      </Row>

      <Row>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <Col
              key={product._id}
              xs={12}
              sm={6}
              md={4}
              lg={3}
              className="mb-4"
            >
              <Card className="h-100 border-0 shadow-sm">
                <div
                  className="position-relative"
                  onClick={() => handleViewDetails(product)}
                  style={{ cursor: "pointer" }}
                >
                  <Card.Img
                    variant="top"
                    src={
                      product.image?.startsWith("data:image")
                        ? product.image
                        : `data:image/jpeg;base64,${product.image}`
                    }
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://via.placeholder.com/200?text=No+Image";
                    }}
                    style={{ objectFit: "cover", height: "250px" }}
                  />
                  {product.discount && (
                    <Badge
                      bg="danger"
                      className="position-absolute top-0 end-0 m-2"
                    >
                      {product.discount}% OFF
                    </Badge>
                  )}
                </div>
                <Card.Body className="d-flex flex-column">
                  <Card.Title
                    className="fw-semibold mb-2 text-truncate"
                    title={product.name}
                  >
                    {product.name}
                  </Card.Title>
                  <Card.Text className="mb-3">
                    {product.oldPrice && (
                      <span className="text-muted text-decoration-line-through me-2">
                        ₹{product.oldPrice}
                      </span>
                    )}
                    <span className="fw-bold text-success">₹{product.price}</span>
                  </Card.Text>
                  <div className="mt-auto d-flex flex-column gap-2">
                    <Button
                      variant="warning"
                      className="w-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <CartPlus className="me-1" /> Add to Cart
                    </Button>
                    <Button
                      variant="primary"
                      className="w-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyNow(product);
                      }}
                    >
                      Buy Now
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        ) : (
          <Col className="text-center">
            <p>No kitchen products found.</p>
          </Col>
        )}
      </Row>

      {/* Details Modal */}
      <Modal show={showDetailsModal} onHide={closeDetailsModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Product Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailsProduct && (
            <Row>
              <Col md={6}>
                <img
                  src={
                    detailsProduct.image?.startsWith("data:image")
                      ? detailsProduct.image
                      : `data:image/jpeg;base64,${detailsProduct.image}`
                  }
                  alt={detailsProduct.name}
                  className="img-fluid rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://via.placeholder.com/400?text=No+Image";
                  }}
                />
              </Col>
              <Col md={6}>
                <h4>{detailsProduct.name}</h4>
                <p>{detailsProduct.details || "No details available"}</p>
                <h5 className="text-success">₹{detailsProduct.price}</h5>
                {detailsProduct.discount && (
                  <Badge bg="danger" className="mb-3">
                    {detailsProduct.discount}% OFF
                  </Badge>
                )}
                <div className="mt-4">
                  <Button
                    variant="warning"
                    className="me-2"
                    onClick={() => handleAddToCart(detailsProduct)}
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleBuyNow(detailsProduct)}
                  >
                    Buy Now
                  </Button>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showCheckout} onHide={() => setShowCheckout(false)} size="lg">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="text-primary">Quick Checkout</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {orderPlaced ? (
            <div className="text-center py-5">
              <CheckCircle size={60} className="text-success mb-3" />
              <h4 className="text-success mb-3">Order Placed Successfully!</h4>
              <p className="mb-1">
                Order ID: #{Math.random().toString(36).substr(2, 9)}
              </p>
              <p className="text-muted mb-4">Thank you for shopping with us!</p>
              <Button
                variant="outline-primary"
                onClick={() => window.location.href = "/kitchen"}
              >
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <CheckoutProgressBar currentStep={step} />
              {renderStepContent()}
            </>
          )}
        </Modal.Body>
        {!orderPlaced && (
          <Modal.Footer className="border-0">
            {step > 1 && (
              <Button variant="outline-secondary" onClick={previousStep}>
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button variant="warning" onClick={nextStep}>
                Continue <ArrowRight size={20} />
              </Button>
            ) : (
              <Button variant="success" onClick={confirmOrder}>
                Place Order <Truck className="ms-2" />
              </Button>
            )}
          </Modal.Footer>
        )}
      </Modal>
    </Container>
  );
};

export default Kitchen;