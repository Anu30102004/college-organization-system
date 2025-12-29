import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, Search, BarChart3, BookOpen, Monitor, DoorOpen, Settings } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { Analytics } from "c:/Users/ANUSHKA/Downloads/College Organization System/src/utils/supabase/info";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { Calendar } from "./components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-7d695253`;

// Update types for state variables
interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  status: string; // Added missing property
}

interface Booking {
  id: string;
  resourceId: string;
  userName: string;
  userRole: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: string; // Ensure this property exists
}

const RESOURCE_TYPES = ["room", "equipment", "book", "faculty_hours"];
const USER_ROLES = ["admin", "faculty", "student"];
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];

export default function App() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddResourceOpen, setIsAddResourceOpen] = useState<boolean>(false);
  const [isAddBookingOpen, setIsAddBookingOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState<boolean>(false);

  // Form states
  const [newResource, setNewResource] = useState({
    name: "",
    type: "room",
    capacity: "",
    location: "",
    description: "",
  });

  const [newBooking, setNewBooking] = useState({
    resourceId: "",
    userName: "",
    userRole: "student",
    startTime: "",
    endTime: "",
    purpose: "",
  });

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resourcesRes, bookingsRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/resources`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`${API_BASE}/bookings`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
        fetch(`${API_BASE}/analytics/utilization`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
      ]);

      const resourcesData = await resourcesRes.json();
      const bookingsData = await bookingsRes.json();
      const analyticsData = await analyticsRes.json();

      if (resourcesData.success) setResources(resourcesData.resources);
      if (bookingsData.success) setBookings(bookingsData.bookings);
      if (analyticsData.success) setAnalytics(analyticsData.analytics);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Initialize with demo data
  const initializeData = async () => {
    try {
      const res = await fetch(`${API_BASE}/initialize`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}` 
        },
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Demo data initialized!");
        fetchData();
      }
    } catch (error) {
      console.error("Error initializing:", error);
      toast.error("Failed to initialize data");
    }
  };

  // Add resource
  const handleAddResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/resources`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify({
          id: `${newResource.type}-${Date.now()}`,
          ...newResource,
          capacity: newResource.capacity ? parseInt(newResource.capacity) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Resource added successfully!");
        setIsAddResourceOpen(false);
        setNewResource({ name: "", type: "room", capacity: "", location: "", description: "" });
        fetchData();
      } else {
        toast.error(data.error || "Failed to add resource");
      }
    } catch (error) {
      console.error("Error adding resource:", error);
      toast.error("Failed to add resource");
    }
  };

  // Add booking
  const handleAddBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify({
          id: `booking-${Date.now()}`,
          userId: `user-${Date.now()}`,
          ...newBooking,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Booking created successfully!");
        setIsAddBookingOpen(false);
        setNewBooking({ resourceId: "", userName: "", userRole: "student", startTime: "", endTime: "", purpose: "" });
        fetchData();
      } else if (res.status === 409) {
        toast.error("Booking conflict detected! This resource is already booked for the selected time.");
      } else {
        toast.error(data.error || "Failed to create booking");
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking");
    }
  };

  // Delete resource
  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/resources/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Resource deleted successfully!");
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete resource");
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Failed to delete resource");
    }
  };

  // Cancel booking
  const handleCancelBooking = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Booking cancelled successfully!");
        fetchData();
      } else {
        toast.error(data.error || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter resources
  const filteredResources = resources.filter((resource: Resource) => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || resource.type === filterType;
    return matchesSearch && matchesType;
  });

  // Get bookings for selected date
  const selectedDateBookings = bookings.filter((booking: Booking) => {
    if (!selectedDate) return false;
    const bookingDate = new Date(booking.startTime);
    return bookingDate.toDateString() === selectedDate.toDateString() && booking.status === "confirmed";
  });

  // Get icon for resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "room": return <DoorOpen className="w-5 h-5" />;
      case "equipment": return <Monitor className="w-5 h-5" />;
      case "book": return <BookOpen className="w-5 h-5" />;
      case "faculty_hours": return <Settings className="w-5 h-5" />;
      default: return <Settings className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Toaster />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl mb-2">Campus Resource Optimizer</h1>
          <p className="text-gray-600">Manage and optimize educational institution resources efficiently</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Button onClick={initializeData} variant="outline">
            Load Demo Data
          </Button>
          <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
                <DialogDescription>Create a new resource to manage in the system</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddResource} className="space-y-4">
                <div>
                  <Label htmlFor="name">Resource Name</Label>
                  <Input
                    id="name"
                    value={newResource.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewResource({ ...newResource, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={newResource.type} onValueChange={(value: string) => setNewResource({ ...newResource, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity (optional)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newResource.capacity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewResource({ ...newResource, capacity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newResource.location}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewResource({ ...newResource, location: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newResource.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewResource({ ...newResource, description: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Add Resource</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddBookingOpen} onOpenChange={setIsAddBookingOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Create Booking
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
                <DialogDescription>Book a resource for a specific time</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddBooking} className="space-y-4">
                <div>
                  <Label htmlFor="resource">Resource</Label>
                  <Select value={newBooking.resourceId} onValueChange={(value: string) => setNewBooking({ ...newBooking, resourceId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource" />
                    </SelectTrigger>
                    <SelectContent>
                      {resources.filter((r: Resource) => r.status === "available").map((resource: Resource) => (
                        <SelectItem key={resource.id} value={resource.id}>
                          {resource.name} - {resource.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="userName">Your Name</Label>
                  <Input
                    id="userName"
                    value={newBooking.userName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBooking({ ...newBooking, userName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="userRole">Role</Label>
                  <Select value={newBooking.userRole} onValueChange={(value: string) => setNewBooking({ ...newBooking, userRole: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={newBooking.startTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={newBooking.endTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    value={newBooking.purpose}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewBooking({ ...newBooking, purpose: e.target.value })}
                    placeholder="e.g., Team meeting, Class session"
                  />
                </div>
                <Button type="submit" className="w-full">Create Booking</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="resources" className="space-y-6">
          <TabsList>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <p className="text-gray-500 col-span-full text-center py-12">Loading resources...</p>
              ) : filteredResources.length === 0 ? (
                <p className="text-gray-500 col-span-full text-center py-12">No resources found. Click "Load Demo Data" to get started.</p>
              ) : (
                filteredResources.map((resource: Resource) => (
                  <Card key={resource.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getResourceIcon(resource.type)}
                          <CardTitle className="text-lg">{resource.name}</CardTitle>
                        </div>
                        <Badge variant={resource.status === "available" ? "default" : "secondary"}>
                          {resource.status}
                        </Badge>
                      </div>
                      <CardDescription>{resource.location}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-600">{resource.description}</p>
                      {resource.capacity && (
                        <p className="text-sm">
                          <span className="font-medium">Capacity:</span> {resource.capacity}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="font-medium">Type:</span> {resource.type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleDeleteResource(resource.id)}
                      >
                        Delete
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {bookings.filter(b => b.status === "confirmed").length === 0 ? (
                <p className="text-gray-500 text-center py-12">No active bookings. Create one to get started!</p>
              ) : (
                bookings
                  .filter(b => b.status === "confirmed")
                  .map((booking: Booking) => {
                    const resource = resources.find((r: Resource) => r.id === booking.resourceId);
                    return (
                      <Card key={booking.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{resource?.name || "Unknown Resource"}</CardTitle>
                              <CardDescription>{booking.userName} ({booking.userRole})</CardDescription>
                            </div>
                            <Badge>{new Date(booking.startTime).toLocaleDateString()}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Start Time</p>
                              <p>{new Date(booking.startTime).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="font-medium">End Time</p>
                              <p>{new Date(booking.endTime).toLocaleString()}</p>
                            </div>
                          </div>
                          {booking.purpose && (
                            <div className="text-sm">
                              <p className="font-medium">Purpose</p>
                              <p className="text-gray-600">{booking.purpose}</p>
                            </div>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handleCancelBooking(booking.id)}
                          >
                            Cancel Booking
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
              )}
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Date</CardTitle>
                  <CardDescription>View bookings for a specific date</CardDescription>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bookings on {selectedDate?.toLocaleDateString()}</CardTitle>
                  <CardDescription>
                    {selectedDateBookings.length} booking(s) scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDateBookings.length === 0 ? (
                      <p className="text-gray-500 text-sm">No bookings for this date</p>
                    ) : (
                      selectedDateBookings.map((booking: Booking) => {
                        const resource = resources.find((r: Resource) => r.id === booking.resourceId);
                        return (
                          <div key={booking.id} className="border rounded-lg p-3 space-y-1">
                            <p className="font-medium">{resource?.name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                              {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-sm text-gray-500">{booking.userName}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Resource Utilization by Type
                    </div>
                  </CardTitle>
                  <CardDescription>Total bookings per resource type</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.length === 0 ? (
                    <p className="text-gray-500 text-sm">No analytics data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalBookings" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Distribution</CardTitle>
                  <CardDescription>Number of resources by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.length === 0 ? (
                    <p className="text-gray-500 text-sm">No analytics data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics}
                          dataKey="totalResources"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label
                        >
                          {analytics.map((entry: Analytics, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Utilization Statistics</CardTitle>
                  <CardDescription>Detailed breakdown of resource usage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {analytics.map((item: Analytics) => (
                      <div key={item.type} className="border rounded-lg p-4 space-y-2">
                        <p className="text-sm text-gray-600 capitalize">
                          {item.type.replace("_", " ")}
                        </p>
                        <p className="text-2xl">{item.totalResources}</p>
                        <p className="text-xs text-gray-500">Resources</p>
                        <div className="pt-2 border-t">
                          <p className="text-sm">{item.totalBookings} bookings</p>
                          <p className="text-sm">{item.totalHours.toFixed(1)} hours</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}