import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, MoreHorizontal, Trash2, Edit, Copy, Send, Clock, Shield, Users, Key, Settings, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useStores } from '@/hooks/useStores';

const initialPermissions = {
  viewRevenue: false,
  addStore: false,
  syncOrders: false,
  importExport: false,
  tabs: {
    orders: 'none',
    trashed: 'none',
    stock: 'none',
    stores: 'none',
    products: 'none',
    whatsapp: 'none',
    tracking: 'none',
    'access-manager': 'none',
  },
  allowedStores: {},
};

const tabLabels = {
  orders: 'Orders',
  trashed: 'Trashed',
  stock: 'Stock Manager',
  stores: 'Stores',
  products: 'Top Products',
  whatsapp: 'WhatsApp Orders',
  tracking: 'Tracking',
  'access-manager': 'Access Manager',
};

const RoleForm = ({ role, onSave, onCancel, allStores }) => {
  const [name, setName] = useState(role ? role.name : '');
  const [permissions, setPermissions] = useState(role ? { ...initialPermissions, ...role.permissions } : initialPermissions);

  const handlePermissionChange = (key, value) => {
    setPermissions(prev => ({ ...prev, [key]: value }));
  };

  const handleTabPermissionChange = (tab, value) => {
    setPermissions(prev => ({
      ...prev,
      tabs: { ...prev.tabs, [tab]: value },
    }));
  };

  const handleStoreAccessChange = (storeId, checked) => {
    setPermissions(prev => {
      const newAllowedStores = { ...prev.allowedStores };
      if (checked) {
        newAllowedStores[storeId] = true;
      } else {
        delete newAllowedStores[storeId];
      }
      return { ...prev, allowedStores: newAllowedStores };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    onSave({ ...role, name, permissions });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="role-name">Role Name</Label>
        <Input id="role-name" value={name} onChange={e => setName(e.target.value)} required />
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Global Permissions</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(initialPermissions).filter(p => typeof initialPermissions[p] === 'boolean').map(key => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <Label htmlFor={`perm-${key}`} className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
              <Switch id={`perm-${key}`} checked={permissions[key]} onCheckedChange={checked => handlePermissionChange(key, checked)} />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Tab Permissions</h3>
        <div className="space-y-2">
          {Object.keys(initialPermissions.tabs).map(tabKey => (
            <div key={tabKey} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <Label>{tabLabels[tabKey]}</Label>
              <Select value={permissions.tabs[tabKey]} onValueChange={value => handleTabPermissionChange(tabKey, value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Access</SelectItem>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">View & Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-semibold">Store Access</h3>
        <div className="space-y-2">
          {allStores.length > 0 ? allStores.map(store => (
            <div key={store.id} className="flex items-center space-x-2 rounded-lg border p-3 shadow-sm">
              <Checkbox
                id={`store-${store.id}`}
                checked={!!permissions.allowedStores[store.id]}
                onCheckedChange={(checked) => handleStoreAccessChange(store.id, checked)}
              />
              <label htmlFor={`store-${store.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {store.name}
              </label>
            </div>
          )) : <p className="text-sm text-muted-foreground">No stores found. Add stores in the 'Stores' tab first.</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{role ? 'Save Changes' : 'Create Role'}</Button>
      </div>
    </form>
  );
};

const UserForm = ({ user, roles, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: '',
    slug: '',
    password: '',
    ...user
  });

  useEffect(() => {
    if (!formData.slug && !user) {
      setFormData(prev => ({ ...prev, slug: uuidv4().slice(0, 8) }));
    }
    if (!formData.roleId && roles.length > 0) {
      setFormData(prev => ({ ...prev, roleId: roles[0].id }));
    }
  }, [user, roles, formData.slug]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder={user ? "Leave blank to keep current password" : ""} />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.roleId} onValueChange={roleId => setFormData({ ...formData, roleId })}>
          <SelectTrigger id="role">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="slug">Dashboard Link Slug</Label>
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground p-2 bg-muted rounded-l-md border border-r-0">{window.location.origin}/access-manager/</span>
          <Input id="slug" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })} required className="rounded-l-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{user ? 'Save Changes' : 'Create User'}</Button>
      </div>
    </form>
  );
};

const AccessManager = () => {
  const [activeSubTab, setActiveSubTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'user' | 'role', data: object }
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { stores: allStores, loadStoresFromStorage } = useStores();

  useEffect(() => {
    loadStoresFromStorage();
  }, [loadStoresFromStorage]);

  useEffect(() => {
    const usersRef = ref(database, 'accessManager/users');
    const rolesRef = ref(database, 'accessManager/roles');
    const logsRef = ref(database, 'accessManager/auditLogs');

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      setUsers(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
      setLoading(false);
    });
    const unsubscribeRoles = onValue(rolesRef, (snapshot) => {
      const data = snapshot.val();
      setRoles(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : []);
    });
    const unsubscribeLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      setAuditLogs(data ? Object.keys(data).map(key => ({ id: key, ...data[key] })).sort((a, b) => b.timestamp - a.timestamp) : []);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
      unsubscribeLogs();
    };
  }, []);

  const logAction = (action, details) => {
    const logRef = push(ref(database, 'accessManager/auditLogs'));
    set(logRef, { action, details, timestamp: Date.now(), user: 'Admin' });
  };

  const handleSaveUser = (userData) => {
    const updates = {};
    let action = 'User Created';
    let actionDetails = `Created new user ${userData.name}`;

    const userPayload = {
      name: userData.name,
      email: userData.email,
      roleId: userData.roleId,
      slug: userData.slug,
    };

    if (userData.id) {
      action = 'User Updated';
      actionDetails = `Updated details for ${userData.name}`;
      if (userData.password) {
        userPayload.password = userData.password;
      }
      updates[`/accessManager/users/${userData.id}`] = userPayload;
    } else {
      userPayload.password = userData.password;
      const newUserId = push(ref(database, 'accessManager/users')).key;
      updates[`/accessManager/users/${newUserId}`] = userPayload;
    }

    update(ref(database), updates)
      .then(() => {
        toast({ title: `User ${userData.id ? 'updated' : 'created'} successfully!` });
        logAction(action, actionDetails);
      })
      .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }));

    setIsUserFormOpen(false);
    setEditingUser(null);
  };

  const handleSaveRole = (roleData) => {
    const updates = {};
    let action = 'Role Created';
    let actionDetails = `Created new role ${roleData.name}`;

    if (roleData.id) {
      action = 'Role Updated';
      actionDetails = `Updated details for role ${roleData.name}`;
      updates[`/accessManager/roles/${roleData.id}`] = { name: roleData.name, permissions: roleData.permissions };
    } else {
      const newRoleId = push(ref(database, 'accessManager/roles')).key;
      updates[`/accessManager/roles/${newRoleId}`] = { name: roleData.name, permissions: roleData.permissions };
    }

    update(ref(database), updates)
      .then(() => {
        toast({ title: `Role ${roleData.id ? 'updated' : 'created'} successfully!` });
        logAction(action, actionDetails);
      })
      .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }));

    setIsRoleFormOpen(false);
    setEditingRole(null);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    const { type, data } = itemToDelete;
    const itemRef = ref(database, `accessManager/${type}s/${data.id}`);
    
    remove(itemRef)
      .then(() => {
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!` });
        logAction(`${type.charAt(0).toUpperCase() + type.slice(1)} Deleted`, `Deleted ${type} ${data.name}`);
      })
      .catch(err => toast({ title: "Error", description: err.message, variant: "destructive" }));
    
    setItemToDelete(null);
  };

  const handleCopyLink = (slug) => {
    const link = `${window.location.origin}/access-manager/${slug}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied!", description: "Dashboard link copied to clipboard." });
  };

  const handleSendInvite = (user) => {
    const link = `${window.location.origin}/access-manager/${user.slug}`;
    const subject = "You're invited to the dashboard!";
    const body = `Hello ${user.name},\n\nYou have been invited to access the dashboard. Please use the following link and your credentials to log in:\n${link}\n\nThis link is unique to you. Please do not share it.`;
    window.location.href = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    logAction('Invite Sent', `Invite sent to ${user.name} at ${user.email}`);
    toast({ title: "Mail client opened", description: "An email draft has been prepared for you to send." });
  };

  const getRoleName = (roleId) => roles.find(r => r.id === roleId)?.name || 'N/A';
  const recentLogs = useMemo(() => auditLogs.slice(0, 5), [auditLogs]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Access Manager</h1>
          <p className="text-muted-foreground">Create and manage user access and roles for the dashboard.</p>
        </div>
        {activeSubTab === 'users' && (
          <Button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create User
          </Button>
        )}
        {activeSubTab === 'roles' && (
          <Button onClick={() => { setEditingRole(null); setIsRoleFormOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Role
          </Button>
        )}
      </div>

      {(isUserFormOpen || isRoleFormOpen) && (
        <Card>
          <CardHeader>
            <CardTitle>{isUserFormOpen ? (editingUser ? 'Edit User' : 'Create New User') : (editingRole ? 'Edit Role' : 'Create New Role')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isUserFormOpen && <UserForm user={editingUser} roles={roles} onSave={handleSaveUser} onCancel={() => { setIsUserFormOpen(false); setEditingUser(null); }} />}
            {isRoleFormOpen && <RoleForm role={editingRole} onSave={handleSaveRole} onCancel={() => { setIsRoleFormOpen(false); setEditingRole(null); }} allStores={allStores} />}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="roles"><Key className="mr-2 h-4 w-4" />Roles</TabsTrigger>
          <TabsTrigger value="audit"><Clock className="mr-2 h-4 w-4" />Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Managed Users</CardTitle><CardDescription>A list of all users with access to this dashboard.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading ? <TableRow><TableCell colSpan={5} className="text-center">Loading users...</TableCell></TableRow> : users.length > 0 ? users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Badge variant="outline">{getRoleName(user.roleId)}</Badge></TableCell>
                      <TableCell><span className="text-green-400 flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-400" />Active</span></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingUser(user); setIsUserFormOpen(true); }}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyLink(user.slug)}><Copy className="mr-2 h-4 w-4" /> Copy Link</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendInvite(user)}><Send className="mr-2 h-4 w-4" /> Send Invite</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => setItemToDelete({ type: 'user', data: user })}><Trash2 className="mr-2 h-4 w-4" /> Revoke Access</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={5} className="text-center">No users found. Create one to get started.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Access Roles</CardTitle><CardDescription>Define roles and their specific permissions.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Role Name</TableHead><TableHead>Users</TableHead><TableHead>Stores</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {roles.length > 0 ? roles.map(role => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{users.filter(u => u.roleId === role.id).length}</TableCell>
                      <TableCell>{role.permissions.allowedStores ? Object.keys(role.permissions.allowedStores).length : 0} / {allStores.length}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingRole(role); setIsRoleFormOpen(true); }}><Settings className="mr-2 h-4 w-4" /> Edit Permissions</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => setItemToDelete({ type: 'role', data: role })}><Trash2 className="mr-2 h-4 w-4" /> Delete Role</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="text-center">No roles found. Create one to get started.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Audit Log</CardTitle><CardDescription>Recent activity in the access manager.</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.length > 0 ? auditLogs.map(log => (
                  <div key={log.id} className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      {log.action.includes('Create') ? <PlusCircle className="h-4 w-4 text-primary" /> : log.action.includes('Update') ? <Edit className="h-4 w-4 text-primary" /> : log.action.includes('Delete') || log.action.includes('Revoke') ? <Trash2 className="h-4 w-4 text-primary" /> : log.action.includes('Invite') ? <Send className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                      <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1"><Clock className="h-3 w-3" /> {new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type} <span className="font-bold">{itemToDelete?.data.name}</span>.
              {itemToDelete?.type === 'role' && users.filter(u => u.roleId === itemToDelete.data.id).length > 0 && (
                <span className="text-destructive font-bold block mt-2"> This role is assigned to {users.filter(u => u.roleId === itemToDelete.data.id).length} user(s). Their access will be broken.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, delete it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default AccessManager;