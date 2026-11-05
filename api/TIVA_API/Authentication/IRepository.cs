namespace TIVA_API.Authentication
{
    // Handles User Validity Related Functions
    public interface IRepository
    {
        // Set to True when ENV is Development ENV - Only application users can be set to devmode.
        // Allows Test Account Authentication
        bool DevMode { get; set; }
        
        // Verifies if User is Valid DB User
        // Only Allow Test Account When DevMode = True
        ClientDto GetClient(Models.Authentication auth);
        
        // Verifies if Clint is Valid Client
        UserDto GetUser(Models.Authentication auth);
    }
}